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
  Select,
  TextField,
  DataTable
} from "@shopify/polaris";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const standardFields = await prisma.standardField.findMany({ where: { shop: session.shop } });
  const rules = await prisma.matchingRule.findMany({
    where: { shop: session.shop },
    include: { standardField: true }
  });

  return Response.json({ standardFields, rules });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const standardFieldId = formData.get("standardFieldId");
  const matchType = formData.get("matchType");
  const threshold = parseFloat(formData.get("threshold")) || null;
  const weight = parseFloat(formData.get("weight")) || 1.0;

  if (standardFieldId && matchType) {
    await prisma.matchingRule.create({
      data: {
        shop: session.shop,
        standardFieldId,
        matchType,
        threshold,
        weight
      }
    });
  }
  
  return Response.json({ success: true });
};

export default function MatchingRules() {
  const { standardFields, rules } = useLoaderData();
  const fetcher = useFetcher();
  
  const [selectedField, setSelectedField] = useState(standardFields[0]?.id || "");
  const [matchType, setMatchType] = useState("exact");
  const [threshold, setThreshold] = useState("0.85");
  const [weight, setWeight] = useState("1.0");

  const handleCreateRule = () => {
    fetcher.submit(
      { standardFieldId: selectedField, matchType, threshold, weight },
      { method: "POST" }
    );
  };

  const ruleRows = rules.map((r) => [
    r.standardField.displayName,
    r.matchType === 'exact' ? 'Exact Match' : 'Fuzzy Match',
    r.matchType === 'fuzzy' ? String(r.threshold * 100) + '%' : 'N/A',
    String(r.weight)
  ]);

  return (
    <Page title="Matching Rules (Deterministic & Probabilistic)">
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Create Matching Rule</Text>
              <Select
                label="Standard Field"
                options={standardFields.map(sf => ({ label: sf.displayName, value: sf.id }))}
                value={selectedField}
                onChange={setSelectedField}
              />
              <Select
                label="Match Type"
                options={[
                  { label: "Exact Match (Deterministic)", value: "exact" },
                  { label: "Fuzzy Match (Probabilistic)", value: "fuzzy" }
                ]}
                value={matchType}
                onChange={setMatchType}
              />
              {matchType === 'fuzzy' && (
                <TextField 
                  label="Confidence Threshold (0.0 to 1.0)" 
                  value={threshold} 
                  onChange={setThreshold} 
                  type="number"
                  step="0.05"
                  autoComplete="off" 
                  helpText="e.g., 0.85 means 85% similarity required."
                />
              )}
              <TextField 
                label="Weight (Importance)" 
                value={weight} 
                onChange={setWeight} 
                type="number"
                step="1"
                autoComplete="off" 
                helpText="Higher weight means this field is more important for matching."
              />
              <Button onClick={handleCreateRule} variant="primary" loading={fetcher.state !== "idle"}>Add Rule</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Active Rules</Text>
              {ruleRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric"]}
                  headings={["Field", "Type", "Threshold", "Weight"]}
                  rows={ruleRows}
                />
              ) : (
                <Text as="p" variant="bodyMd">No matching rules defined.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
