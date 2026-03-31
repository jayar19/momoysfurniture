# momoysfurniture

## PayMongo GCash setup

Add these environment variables before using the hosted GCash checkout:

- `PAYMONGO_SECRET_KEY`: your PayMongo secret key
- `PAYMONGO_WEBHOOK_SECRET`: the signing secret for your PayMongo webhook endpoint
- `APP_BASE_URL`: your public app URL, for example `http://localhost:3000` in development or your deployed site URL in production

Create one PayMongo webhook in the dashboard that points to:

- `/api/payments/paymongo/webhook`

Subscribe it to at least:

- `checkout_session.payment.paid`

The payment page now creates a PayMongo Checkout Session for the saved order down payment, redirects the customer to PayMongo's secure GCash checkout page, and updates the order after a successful payment confirmation.
