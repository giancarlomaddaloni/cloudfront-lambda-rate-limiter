# 🚦 Client ID Rate-Limiting System

A scalable rate-limiting system built on **AWS CloudFront**, **Lambda@Edge**, and **DynamoDB**. This project enforces per-client throttling at the edge, supports automated notifications via SES, and is fully deployed using AWS CDK.

---

## 🧩 Key Features

- ⚙️ **Edge-level Rate Limiting** with CloudFront + Lambda@Edge
- 🪣 **Token Bucket Algorithm** stored in DynamoDB
- 🔒 **Per-client Quotas** via `client_id`
- 📬 **Email Notifications** for abuse detection using Amazon SES
- 🛠️ **Infrastructure as Code** with AWS CDK (TypeScript)
- 🧪 Integrated with Jest for unit testing

---

## 🧱 Architecture Overview

1. 🌐 A request hits **CloudFront**
2. 🧠 **Viewer Lambda** extracts `client_id` from the query string and adds it as a header
3. 🛡️ **Origin Lambda** validates request limits using a DynamoDB-based token bucket
4. 📉 If the quota is exceeded:
   - Returns `429 Too Many Requests`
   - Logs denial in a notifications DynamoDB table
5. 📣 **Notification Lambda** runs on a schedule to email summaries of denials

---

## 📁 Project Structure

```bash
cdk/
  └── lib/
      ├── lambda-functions/
      │   ├── viewer-request/        # viewer-index.js
      │   ├── origin-request/        # origin-index.js
      │   └── notifications/         # notifications-index.js
      ├── lambda-uploader.ts
      ├── dynamoDB-stack.ts
      ├── lambda-viewer-stack.ts
      ├── lambda-origin-stack.ts
      └── lambda-notifications-stack.ts

policies/
  ├── default-policy.json
  ├── default-trust-relationship.json
  └── dynamodb-policy.json

docs/
  ├── README.md
  └── architecture-diagram.png

# Root files
package.json
tsconfig.json
cdk.json
LICENSE
```

---

## ⚙️ Deployment

You can deploy using AWS CDK with TypeScript:

```bash
npx cdk deploy
```

CDK will handle:
- IAM roles
- DynamoDB tables
- Lambda@Edge code upload
- SES permissions (if configured)

---

## 🧪 Configuration (via ENV Variables)

- `PROJECT_NAME`
- `ENVIRONMENT`
- `AWS_REGION`
- `ORIGIN_TABLE_NAME`
- `NOTIFICATIONS_TABLE_NAME`
- `MAX_CLIENTID_REQUESTS_PER_PERIOD`
- `PERIOD_IN_SECONDS`
- `REFILL_TOKENS_PER_PERIOD`

---

## 🌐 Example Request

```http
GET https://example-cdn.com/assets/kanu.js?client_id=demo-client-123
```

---

## 📬 Notifications

An alert is triggered if a client consistently exceeds quota. These alerts are batched and emailed via **Amazon SES**.

---

## 🧾 License

This project is licensed under the MIT License. Feel free to use, modify, and share with attribution.

---

## 📌 Authors & Contributions

👤 Maintained by **Giancarlo Maddaloni** — Senior DevOps Engineer  
🏢 Developed under **Kanu Technologies**, specializing in secure cloud infrastructure and automation  
🤝 Contributions are welcome via pull requests or GitHub issues!
