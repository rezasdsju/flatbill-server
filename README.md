# FlatBill API: Building Bill & Service Charge Management Backend

REST API for FlatBill. It handles buildings, flats, monthly bill generation, payments, expenses, notices and complaints. Requests are secured with JWT, and custom Express middlewares (verifyToken, verifyAdmin, verifyOwner, verifyTenant) make sure each role can only access its own routes and its own building's data.

> This repository contains the **Express backend** of FlatBill.

## Related Repository

- [FlatBill Frontend](https://github.com/rezasdsju/housebill-client)