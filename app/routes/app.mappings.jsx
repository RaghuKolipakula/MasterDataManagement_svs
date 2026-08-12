import { useState } from "react";

import { useLoaderData, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { 
  Page, 
  Layout, 
  Card, 
  Button, 
  Text,
  BlockStack,
  Select,
  TextField,
  DataTable,
  InlineStack
} from "@shopify/polaris";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const dataSources = await prisma.dataSource.findMany({ where: { shop: session.shop } });
  const standardFields = await prisma.standardField.findMany({ where: { shop: session.shop } });
  const mappings = await prisma.fieldMapping.findMany({
    where: { dataSource: { shop: session.shop } },
    include: { dataSource: true, standardField: true }
  });

  return Response.json({ dataSources, standardFields, mappings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const intent = formData.get("intent");

  if (intent === "create_standard_field") {
    const name = formData.get("name");
    const displayName = formData.get("displayName");
    const type = formData.get("type");
    
    await prisma.standardField.create({
      data: { shop: session.shop, name, displayName, type }
    });
  } else if (intent === "create_mapping") {
    const dataSourceId = formData.get("dataSourceId");
    const standardFieldId = formData.get("standardFieldId");
    const sourceFieldName = formData.get("sourceFieldName");

    // Upsert mapping so we only have one mapping per source + standard field
    const existing = await prisma.fieldMapping.findUnique({
      where: {
        dataSourceId_standardFieldId: {
          dataSourceId,
          standardFieldId
        }
      }
    });

    if (existing) {
      await prisma.fieldMapping.update({
        where: { id: existing.id },
        data: { sourceFieldName }
      });
    } else {
      await prisma.fieldMapping.create({
        data: { dataSourceId, standardFieldId, sourceFieldName }
      });
    }
  }
  
  return Response.json({ success: true });
};

export default function FieldMappings() {
  const { dataSources, standardFields, mappings } = useLoaderData();
  const fetcher = useFetcher();
  
  // Standard field state
  const [sfName, setSfName] = useState("");
  const [sfDisplayName, setSfDisplayName] = useState("");
  const [sfType, setSfType] = useState("string");

  // Mapping state
  const [selectedSource, setSelectedSource] = useState(dataSources[0]?.id || "");
  const [selectedStandard, setSelectedStandard] = useState(standardFields[0]?.id || "");
  const [sourceFieldName, setSourceFieldName] = useState("");

  const handleCreateStandardField = () => {
    fetcher.submit(
      { intent: "create_standard_field", name: sfName, displayName: sfDisplayName, type: sfType },
      { method: "POST" }
    );
    setSfName("");
    setSfDisplayName("");
  };

  const handleCreateMapping = () => {
    fetcher.submit(
      { intent: "create_mapping", dataSourceId: selectedSource, standardFieldId: selectedStandard, sourceFieldName },
      { method: "POST" }
    );
    setSourceFieldName("");
  };

  const mappingRows = mappings.map((m) => [
    m.dataSource.name,
    m.standardField.displayName,
    m.sourceFieldName
  ]);

  return (
    <Page title="Field Mappings">
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">1. Define Standard Fields (Golden Schema)</Text>
              <TextField label="Internal Name (e.g. email)" value={sfName} onChange={setSfName} autoComplete="off" />
              <TextField label="Display Name (e.g. Email Address)" value={sfDisplayName} onChange={setSfDisplayName} autoComplete="off" />
              <Select
                label="Data Type"
                options={[{ label: "Text", value: "string" }, { label: "Number", value: "number" }]}
                value={sfType}
                onChange={setSfType}
              />
              <Button onClick={handleCreateStandardField} loading={fetcher.state !== "idle"}>Create Standard Field</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">2. Map Source to Standard Fields</Text>
              <Select
                label="Data Source"
                options={dataSources.map(ds => ({ label: ds.name, value: ds.id }))}
                value={selectedSource}
                onChange={setSelectedSource}
              />
              <Select
                label="Standard Field"
                options={standardFields.map(sf => ({ label: sf.displayName, value: sf.id }))}
                value={selectedStandard}
                onChange={setSelectedStandard}
              />
              <TextField 
                label="Exact Field Name in Source (e.g. 'Email_Address')" 
                value={sourceFieldName} 
                onChange={setSourceFieldName} 
                autoComplete="off" 
              />
              <Button onClick={handleCreateMapping} variant="primary" loading={fetcher.state !== "idle"}>Map Field</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Current Mappings</Text>
              {mappingRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Source", "Standard Field", "Source Field Name"]}
                  rows={mappingRows}
                />
              ) : (
                <Text as="p" variant="bodyMd">No mappings defined yet.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
