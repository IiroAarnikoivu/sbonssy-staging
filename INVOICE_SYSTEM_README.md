# Invoice Generation System for Visitor Events

## Overview

This system automatically generates invoices for each visitor event entry, regardless of the same ambassador or campaign. It supports all four compensation types: pay-per-sale, pay-per-click, pay-per-lead, and flat-fee.

## Key Features

### 1. Automatic Invoice Generation

- **Per-Event Invoicing**: Each visitor event that generates earnings creates a separate invoice
- **Real-time Processing**: Invoices are generated automatically when events are tracked
- **Zero-Amount Filtering**: Events with no earnings are skipped
- **Duplicate Prevention**: Events can only be invoiced once

### 2. Compensation Type Support

- **Pay-per-Sale**: Invoices generated on purchase events with commission calculation
- **Pay-per-Click**: Invoices generated immediately on click events
- **Pay-per-Lead**: Invoices generated on lead conversion events
- **Flat-Fee**: Invoices generated on participation events

### 3. Refund Handling

- **Automatic Cancellation**: Refund events automatically cancel original purchase invoices
- **Smart Processing**: Prevents invoicing of already-invoiced purchases during refunds
- **Multiple Cancellation Methods**: Supports voiding, deletion, and credit notes based on invoice status

### 4. Comprehensive Management

- **Dashboard API**: Complete overview of invoice status and metrics
- **Bulk Operations**: Process multiple invoices at once
- **Analytics**: Detailed reporting and analytics
- **Webhook Integration**: Real-time Stripe webhook handling

## API Endpoints

### Core Invoice Operations

#### Generate Invoice for Event

```
POST /api/payments/generate-event-invoice
Body: { eventId: string, forceRegenerate?: boolean }
```

#### Check Invoice Status

```
GET /api/payments/generate-event-invoice?eventId={eventId}
```

#### Cancel Invoice

```
POST /api/payments/cancel-event-invoice
Body: { eventId: string, reason?: string }
```

### Bulk Operations

#### Bulk Invoice Generation

```
POST /api/payments/bulk-generate-invoices
Body: {
  campaignId?: string,
  brandId?: string,
  athleteId?: string,
  startDate?: string,
  endDate?: string,
  limit?: number
}
```

#### Get Uninvoiced Events Count

```
GET /api/payments/bulk-generate-invoices?campaignId={id}&brandId={id}...
```

### Management & Analytics

#### Invoice Dashboard

```
GET /api/payments/invoice-dashboard?brandId={id}&campaignId={id}...
```

#### Event-Based Invoices List

```
GET /api/payments/event-invoices?brandId={id}&page={num}&limit={num}...
```

#### Invoice Analytics

```
GET /api/analytics/invoice-analytics?brandId={id}&groupBy={day|week|month}...
```

### Automation

#### Cron Job for Auto-Processing

```
GET /api/cron/generate-invoices
Authorization: Bearer {CRON_SECRET}
```

#### Webhook Handler

```
POST /api/payments/webhook-invoices
```

## Database Schema Updates

### VisitorEvent Model Additions

```javascript
{
  // Existing fields...
  invoicedAt: { type: Date },
  invoicedInvoiceId: { type: String },
  invoiceCancelledAt: { type: Date },
  invoiceCancellationReason: { type: String },
}
```

### Invoice Model Additions

```javascript
{
  // Existing fields...
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "VisitorEvent" },
  status: ["draft", "open", "paid", "void", "uncollectible", "credited"],
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
}
```

## Automatic Processing Flow

### 1. Event Tracking

When a visitor event is tracked via `/api/click` or `/api/postback`:

1. **Event Creation**: VisitorEvent record is created
2. **Amount Calculation**: Ambassador earnings and platform fees are calculated
3. **Auto-Invoice Trigger**: If earnings > 0, invoice generation is triggered asynchronously
4. **Refund Handling**: If event is a refund, original invoice cancellation is triggered

### 2. Invoice Generation Process

1. **Validation**: Check if event should be invoiced
2. **Stripe Customer**: Verify brand has Stripe customer ID
3. **Line Items**: Create separate line items for ambassador commission and platform fee
4. **Stripe Invoice**: Create and finalize Stripe invoice
5. **Local Record**: Create local Invoice record
6. **Event Update**: Mark VisitorEvent as invoiced

### 3. Refund Processing

1. **Original Event Lookup**: Find original purchase event by transactionId
2. **Invoice Check**: Verify original event was invoiced
3. **Cancellation**: Cancel original invoice based on status:
   - **Draft**: Delete invoice
   - **Open**: Void invoice
   - **Paid**: Create credit note and refund

## Configuration

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET_INVOICES=whsec_...
CRON_SECRET=your-cron-secret
NEXTAUTH_URL=https://your-domain.com
```

### Cron Job Setup

Set up a cron job to call the auto-processing endpoint:

```bash
# Every hour
0 * * * * curl -H "Authorization: Bearer ${CRON_SECRET}" ${NEXTAUTH_URL}/api/cron/generate-invoices
```

## Usage Examples

### Manual Invoice Generation

```javascript
// Generate invoice for a specific event
const response = await fetch("/api/payments/generate-event-invoice", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ eventId: "event_id_here" }),
});
```

### Process All Uninvoiced Events

```javascript
// Process all uninvoiced events for a brand
const response = await fetch("/api/payments/bulk-generate-invoices", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    brandId: "brand_id_here",
    limit: 100,
  }),
});
```

### Get Dashboard Data

````javascript
// Get complete dashboard overview
const response = await fetch('/api/payments/invoice-dashboard?brandId=brand_id');
const data = await response.json();



## Error Handling

The system includes comprehensive error handling:

- **Duplicate Prevention**: Events cannot be invoiced twice
- **Validation**: All required fields are validated
- **Stripe Errors**: Stripe API errors are caught and logged
- **Webhook Verification**: Stripe webhook signatures are verified
- **Graceful Degradation**: Errors in auto-processing don't block main operations

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Uninvoiced Events Count**: Should remain low
2. **Failed Invoice Generation**: Monitor error rates
3. **Processing Delays**: Events should be invoiced within 1 hour
4. **Refund Processing**: Ensure refunds properly cancel invoices

### Dashboard Indicators
- **Queue Status**: Shows pending and recently processed invoices
- **Problematic Events**: Lists events that failed to be invoiced
- **Revenue Metrics**: Real-time revenue and commission tracking
- **Status Breakdown**: Invoice status distribution

## Integration with Existing System

This invoice system integrates seamlessly with the existing Stripe Connect affiliate system:

1. **Preserves Existing Flow**: All existing tracking continues to work
2. **Extends Functionality**: Adds per-event invoicing on top of existing features
3. **Uses Existing Models**: Builds on VisitorEvent and Invoice models
4. **Stripe Connect Compatible**: Works with existing Stripe Connect setup

## Testing

### Test Scenarios
1. **Pay-per-Click**: Click event → Immediate invoice generation
2. **Pay-per-Sale**: Purchase event → Invoice generation → Refund → Invoice cancellation
3. **Pay-per-Lead**: Lead event → Invoice generation
4. **Flat-Fee**: Participation event → Invoice generation
5. **Zero Amount**: Click in pay-per-sale → No invoice generated
6. **Bulk Processing**: Multiple events → Batch invoice generation

### Test Commands
```bash
# Test single event invoice generation
curl -X POST /api/payments/generate-event-invoice \
  -H "Content-Type: application/json" \
  -d '{"eventId": "event_id_here"}'

# Test bulk processing
curl -X POST /api/payments/bulk-generate-invoices \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Test cron job
curl -H "Authorization: Bearer ${CRON_SECRET}" \
  /api/cron/generate-invoices
````

This comprehensive invoice generation system ensures that every visitor event that generates earnings is properly invoiced, providing complete financial tracking and automated processing for your affiliate marketing platform.
