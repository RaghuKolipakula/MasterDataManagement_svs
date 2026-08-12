import { authenticate } from "../shopify.server";
import { 
  Page, 
  Layout, 
  Card, 
  Text,
  BlockStack,
  Button,
  InlineGrid,
  CalloutCard
} from "@shopify/polaris";
import { useNavigate } from "react-router";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const navigate = useNavigate();

  return (
    <Page title="Master Data Management (MDM)">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Welcome to your Golden Record engine!</Text>
                <Text as="p" variant="bodyMd">
                  Consolidate customer data from Shopify, POS systems, loyalty programs, and external CRMs into a single source of truth. Follow the steps below to configure your matching pipeline.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <InlineGrid columns={2} gap="400">
          <CalloutCard
            title="1. Connect Data Sources"
            illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
            primaryAction={{
              content: 'Manage Sources',
              onAction: () => navigate('/app/data-sources'),
            }}
          >
            <p>Register external data feeds and upload CSV records to be processed.</p>
          </CalloutCard>

          <CalloutCard
            title="2. Map Schema (ETL)"
            illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
            primaryAction={{
              content: 'Configure Mappings',
              onAction: () => navigate('/app/mappings'),
            }}
          >
            <p>Define standard fields (e.g. Email, Phone) and map incoming source data.</p>
          </CalloutCard>

          <CalloutCard
            title="3. Configure Matching Rules"
            illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
            primaryAction={{
              content: 'Matching Rules',
              onAction: () => navigate('/app/matching-rules'),
            }}
          >
            <p>Set deterministic (exact) or probabilistic (fuzzy) rules to link records.</p>
          </CalloutCard>

          <CalloutCard
            title="4. Survivorship Rules"
            illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
            primaryAction={{
              content: 'Survivorship',
              onAction: () => navigate('/app/survivorship'),
            }}
          >
            <p>Decide which data source wins when there are conflicting field values.</p>
          </CalloutCard>
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <CalloutCard
              title="View Golden Records"
              illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
              primaryAction={{
                content: 'View Master Data',
                onAction: () => navigate('/app/golden-records'),
              }}
            >
              <p>Explore your resolved, high-quality, single-source-of-truth customer profiles.</p>
            </CalloutCard>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
