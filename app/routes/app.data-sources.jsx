import { useState } from "react";

import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { 
  Page, 
  Layout, 
  Card, 
  Button, 
  Text,
  BlockStack,
  TextField,
  Select,
  DataTable
} from "@shopify/polaris";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const dataSources = await prisma.dataSource.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: 'desc' }
  });

  return Response.json({ dataSources });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const name = formData.get("name");
  const type = formData.get("type");

  if (name && type) {
    await prisma.dataSource.create({
      data: {
        shop: session.shop,
        name,
        type
      }
    });
  }
  
  return Response.json({ success: true });
};

export default function DataSources() {
  const { dataSources } = useLoaderData();
  const fetcher = useFetcher();
  
  const [name, setName] = useState("");
  const [type, setType] = useState("CSV");

  const handleSubmit = () => {
    fetcher.submit(
      { name, type },
      { method: "POST" }
    );
    setName("");
  };

  const rows = dataSources.map((ds) => [
    ds.name,
    ds.type,
    new Date(ds.createdAt).toLocaleDateString()
  ]);

  return (
    <Page title="Data Sources">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Add New Data Source</Text>
              <TextField 
                label="Source Name" 
                value={name} 
                onChange={setName} 
                autoComplete="off" 
              />
              <Select
                label="Source Type"
                options={[
                  { label: "CSV Upload", value: "CSV" },
                  { label: "CRM System", value: "CRM" },
                  { label: "Shopify Store", value: "Shopify" },
                  { label: "Loyalty Program", value: "Loyalty" }
                ]}
                value={type}
                onChange={setType}
              />
              <Button onClick={handleSubmit} loading={fetcher.state !== "idle"} variant="primary">
                Add Source
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Connected Sources</Text>
              {rows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Name", "Type", "Added On"]}
                  rows={rows}
                />
              ) : (
                <Text as="p" variant="bodyMd">No data sources connected yet.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
