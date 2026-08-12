
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { 
  Page, 
  Layout, 
  Card, 
  Text,
  BlockStack,
  DataTable,
  Badge
} from "@shopify/polaris";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const goldenRecords = await prisma.goldenRecord.findMany({
    where: { shop: session.shop },
    include: {
      sourceRecords: {
        include: { dataSource: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 50 // Limit for UI performance in this iteration
  });

  const standardFields = await prisma.standardField.findMany({
    where: { shop: session.shop }
  });

  return Response.json({ goldenRecords, standardFields });
};

export default function GoldenRecords() {
  const { goldenRecords, standardFields } = useLoaderData();

  const headings = [
    "Record ID",
    ...standardFields.map(sf => sf.displayName),
    "Source Lineage"
  ];
  
  const columnContentTypes = [
    "text", 
    ...standardFields.map(() => "text"),
    "text"
  ];

  const rows = goldenRecords.map((gr) => {
    const data = typeof gr.data === 'string' ? JSON.parse(gr.data) : gr.data;
    
    // Create badges for each source that contributed
    const sources = gr.sourceRecords.map(sr => sr.dataSource.name);
    const uniqueSources = [...new Set(sources)];
    
    const row = [
      gr.id.substring(0, 8) + "...", // Shortened ID
    ];

    for (const sf of standardFields) {
      row.push(data[sf.name] || "-");
    }

    row.push(
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {uniqueSources.map(src => (
          <Badge key={src}>{src}</Badge>
        ))}
      </div>
    );

    return row;
  });

  return (
    <Page title="Master Data (Golden Records)">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {rows.length > 0 ? (
              <DataTable
                columnContentTypes={columnContentTypes}
                headings={headings}
                rows={rows}
              />
            ) : (
              <div style={{ padding: '2rem' }}>
                <BlockStack gap="200" align="center">
                  <Text as="p" variant="bodyMd">
                    No Golden Records found. 
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    You need to import data sources, configure mappings, and run the matching engine.
                  </Text>
                </BlockStack>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
