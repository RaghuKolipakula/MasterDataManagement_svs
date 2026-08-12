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
  DataTable
} from "@shopify/polaris";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const dataSources = await prisma.dataSource.findMany({ where: { shop: session.shop } });
  const standardFields = await prisma.standardField.findMany({ where: { shop: session.shop } });
  const rules = await prisma.survivorshipRule.findMany({
    where: { shop: session.shop },
    include: { standardField: true, dataSource: true },
    orderBy: [
      { standardFieldId: 'asc' },
      { priority: 'asc' }
    ]
  });

  return Response.json({ dataSources, standardFields, rules });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const standardFieldId = formData.get("standardFieldId");
  const dataSourceId = formData.get("dataSourceId");
  const priority = parseInt(formData.get("priority"), 10);

  if (standardFieldId && dataSourceId && !isNaN(priority)) {
    // Upsert to enforce unique constraint on field+source
    const existing = await prisma.survivorshipRule.findUnique({
      where: {
        standardFieldId_dataSourceId: {
          standardFieldId,
          dataSourceId
        }
      }
    });

    if (existing) {
      await prisma.survivorshipRule.update({
        where: { id: existing.id },
        data: { priority }
      });
    } else {
      await prisma.survivorshipRule.create({
        data: { shop: session.shop, standardFieldId, dataSourceId, priority }
      });
    }
  }
  
  return Response.json({ success: true });
};

export default function SurvivorshipRules() {
  const { dataSources, standardFields, rules } = useLoaderData();
  const fetcher = useFetcher();
  
  const [selectedField, setSelectedField] = useState(standardFields[0]?.id || "");
  const [selectedSource, setSelectedSource] = useState(dataSources[0]?.id || "");
  const [priority, setPriority] = useState("1");

  const handleCreateRule = () => {
    fetcher.submit(
      { standardFieldId: selectedField, dataSourceId: selectedSource, priority },
      { method: "POST" }
    );
  };

  const ruleRows = rules.map((r) => [
    r.standardField.displayName,
    r.dataSource.name,
    String(r.priority)
  ]);

  return (
    <Page title="Survivorship Rules (Data Priority)">
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Define Source Priority</Text>
              <Select
                label="Standard Field"
                options={standardFields.map(sf => ({ label: sf.displayName, value: sf.id }))}
                value={selectedField}
                onChange={setSelectedField}
              />
              <Select
                label="Data Source"
                options={dataSources.map(ds => ({ label: ds.name, value: ds.id }))}
                value={selectedSource}
                onChange={setSelectedSource}
              />
              <TextField 
                label="Priority Level" 
                value={priority} 
                onChange={setPriority} 
                type="number"
                step="1"
                autoComplete="off" 
                helpText="Lower number = Higher Priority (1 wins over 2)"
              />
              <Button onClick={handleCreateRule} variant="primary" loading={fetcher.state !== "idle"}>Save Rule</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Active Rules</Text>
              {ruleRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "numeric"]}
                  headings={["Field", "Source", "Priority"]}
                  rows={ruleRows}
                />
              ) : (
                <Text as="p" variant="bodyMd">No survivorship rules defined.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
