# FlatBill API: Building Bill & Service Charge Management Backend

REST API for FlatBill. It handles buildings, flats, monthly bill generation, payments, expenses, notices and complaints. Requests are secured with JWT, and custom Express middlewares (verifyToken, verifyAdmin, verifyOwner, verifyTenant) make sure each role can only access its own routes and its own building's data.

> This repository contains the **Express backend** of FlatBill.

## Live Links

| Resource | Link |
|---|---|
| Live Website | https://flatbill-bd.vercel.app/ |
| API Base URL | https://flatbill-server.vercel.app/ |
| Frontend Repository | https://github.com/rezasdsju/flatbill-client |