# API call-site inventory

Exact expressions include payload transformations and query construction. Resolve facade signatures in `mobile-app/src/api/services.ts`; calls include dormant methods. Reachability is documented separately.

## mobile-app/src/api/http.ts:46

```ts
fetch(`${BASE_URL}${path}`, { headers: buildHeaders(token) })
```

## mobile-app/src/api/http.ts:52

```ts
fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
```

## mobile-app/src/api/http.ts:62

```ts
fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: buildHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
```

## mobile-app/src/api/http.ts:72

```ts
fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers: buildHeaders(token),
    })
```

## mobile-app/src/api/http.ts:82

```ts
fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(token, true), // no Content-Type so browser sets multipart boundary
      body: formData,
    })
```

## mobile-app/src/api/http.ts:93

```ts
fetch(`${BASE_URL}${path}`, { headers: buildHeaders(token) })
```

## mobile-app/src/api/services.ts:63

```ts
api.get<{ status: string }>("/health")
```

## mobile-app/src/api/services.ts:73

```ts
api.post<TokenResponse>("/auth/login", { username, password })
```

## mobile-app/src/api/services.ts:77

```ts
api.post<TokenResponse>("/auth/login", { username, password })
```

## mobile-app/src/api/services.ts:82

```ts
api.post(`/auth/request-reset/${encodeURIComponent(username)}`)
```

## mobile-app/src/api/services.ts:87

```ts
api.post("/auth/reset-password", { username, reset_code: resetCode, new_password: newPassword })
```

## mobile-app/src/api/services.ts:94

```ts
api.post<RegisterResponse>("/auth/register", { username, password, company_name: companyName })
```

## mobile-app/src/api/services.ts:98

```ts
api.post<TokenResponse>("/auth/signup", { username, password })
```

## mobile-app/src/api/services.ts:109

```ts
api.put(`/auth/users/username/${encodeURIComponent(currentUsername)}`, {
      new_username: nextUsername,
      new_password: password,
    })
```

## mobile-app/src/api/services.ts:116

```ts
api.delete(`/auth/users/username/${encodeURIComponent(username)}`)
```

## mobile-app/src/api/services.ts:120

```ts
api.get<Array<{ id: string; username: string; role: "admin" | "staff" }>>("/auth/users")
```

## mobile-app/src/api/services.ts:131

```ts
api.put(`/auth/users/username/${encodeURIComponent(username)}`, {
      new_username: username,
      new_password: newPassword,
    })
```

## mobile-app/src/api/services.ts:143

```ts
api.get<AccountInfo>("/account/me")
```

## mobile-app/src/api/services.ts:144

```ts
api.get<AccountUsage>("/account/usage")
```

## mobile-app/src/api/services.ts:151

```ts
api.get<Catalog>("/catalog")
```

## mobile-app/src/api/services.ts:158

```ts
api.get<CompanyInfo>("/account/company")
```

## mobile-app/src/api/services.ts:160

```ts
api.put<CompanyInfo>("/account/company", payload)
```

## mobile-app/src/api/services.ts:182

```ts
api.getPaginated<InvoiceListItem>(`/invoices${query}`)
```

## mobile-app/src/api/services.ts:186

```ts
api.get<InvoiceDetail>(`/invoices/${rentalId}`)
```

## mobile-app/src/api/services.ts:193

```ts
api.get<Array<{ id: string; name: string }>>("/categories")
```

## mobile-app/src/api/services.ts:198

```ts
api.post<{ id: string; name: string }>("/categories", { name })
```

## mobile-app/src/api/services.ts:203

```ts
api.delete(`/categories/${id}`)
```

## mobile-app/src/api/services.ts:222

```ts
api.getPaginated<Equipment>(`/equipment${query}`)
```

## mobile-app/src/api/services.ts:228

```ts
api.getPaginated<Equipment>(`/equipment?page=1&page_size=200`)
```

## mobile-app/src/api/services.ts:236

```ts
api.post<Equipment>("/equipment", {
      name: payload.name,
      description: payload.description,
      stock_count: payload.stock_count || 0,
      rent_per_day: payload.rent_per_day || 0,
      purchase_price_per_unit: payload.purchase_price_per_unit || 0,
      useful_life_years: payload.useful_life_years || undefined,
      category_id: payload.category_id,
      images: payload.images || [],
      damaged_count: payload.damaged_count || 0,
    })
```

## mobile-app/src/api/services.ts:250

```ts
api.put<Equipment>(`/equipment/${id}`, {
      name: payload.name,
      description: payload.description,
      rent_per_day: payload.rent_per_day,
      purchase_price_per_unit: payload.purchase_price_per_unit,
      useful_life_years: payload.useful_life_years,
      category_id: payload.category_id,
      images: payload.images,
    })
```

## mobile-app/src/api/services.ts:262

```ts
api.delete(`/equipment/${id}`)
```

## mobile-app/src/api/services.ts:266

```ts
api.post<Equipment>(`/equipment/${id}/stock`, {
      quantity_added: quantityAdded,
      unit_price: unitPrice,
      note,
    })
```

## mobile-app/src/api/services.ts:280

```ts
api.post<MaintenanceLog>("/equipment/maintenance", {
      equipment_id: equipmentId,
      action,
      remark,
      cost: cost || 0,
      photos: extra?.photos || [],
      rental_id: extra?.rentalId,
      customer_id: extra?.customerId,
    })
```

## mobile-app/src/api/services.ts:292

```ts
api.post<Equipment>(`/equipment/${id}/scrap`, {
      quantity,
      remark,
    })
```

## mobile-app/src/api/services.ts:308

```ts
api.post<EquipmentSale>(`/equipment/${id}/sell`, payload)
```

## mobile-app/src/api/services.ts:325

```ts
api.getPaginated<EquipmentSale>(`/equipment/sales${query}`)
```

## mobile-app/src/api/services.ts:330

```ts
api.post<EquipmentSale>(`/equipment/sales/${id}/payment`, {
      amount_paid: amountPaid,
    })
```

## mobile-app/src/api/services.ts:337

```ts
api.get<EquipmentSalesSummary>(`/equipment/sales/summary${query}`)
```

## mobile-app/src/api/services.ts:344

```ts
api.get<InventorySummary>("/inventory/summary")
```

## mobile-app/src/api/services.ts:347

```ts
api.getPaginated<InventoryTransaction>("/inventory/transactions")
```

## mobile-app/src/api/services.ts:357

```ts
api.get<NetProfitReport>(`/reports/net-profit${query}`)
```

## mobile-app/src/api/services.ts:370

```ts
api.getPaginated<Customer>(`/customers${query}`)
```

## mobile-app/src/api/services.ts:375

```ts
api.post<Customer>("/customers", {
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      doc_url: payload.doc_url,
      photo_url: payload.photo_url,
    })
```

## mobile-app/src/api/services.ts:385

```ts
api.put<Customer>(`/customers/${id}`, {
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      doc_url: payload.doc_url,
      photo_url: payload.photo_url,
    })
```

## mobile-app/src/api/services.ts:395

```ts
api.delete(`/customers/${id}`)
```

## mobile-app/src/api/services.ts:409

```ts
api.getPaginated<Rental>(`/rentals${query}`)
```

## mobile-app/src/api/services.ts:427

```ts
api.getPaginated<Rental>(`/rentals/history${query}`)
```

## mobile-app/src/api/services.ts:439

```ts
api.post<Rental>("/rentals", payload)
```

## mobile-app/src/api/services.ts:449

```ts
api.post<Rental[]>("/rentals/bulk", payload)
```

## mobile-app/src/api/services.ts:460

```ts
api.post<Rental>(`/rentals/${id}/complete`, {
      discount_amount: discountAmount,
      amount_paid_on_return: amountPaidOnReturn,
      due_date: dueDate || undefined,
      late_fee_amount: lateFeeAmount || undefined,
      tax_rate_percent: taxRatePercent,
    })
```

## mobile-app/src/api/services.ts:470

```ts
api.post<Rental>(`/rentals/${id}/payment`, {
      amount_paid: amountPaid,
      discount_amount: discountAmount,
      due_date: dueDate || undefined,
    })
```

## mobile-app/src/api/services.ts:481

```ts
api.put<Rental>(`/rentals/${id}`, payload)
```

## mobile-app/src/api/services.ts:485

```ts
api.post<Rental>(`/rentals/${id}/cancel`)
```

## mobile-app/src/api/services.ts:506

```ts
api.get<Reservation[]>(`/reservations${query}`)
```

## mobile-app/src/api/services.ts:512

```ts
api.post<Reservation>("/reservations", {
        customer_id: customerId,
        equipment_id: equipmentId,
        quantity,
      })
```

## mobile-app/src/api/services.ts:531

```ts
api.delete(`/reservations/${id}`)
```

## mobile-app/src/api/services.ts:536

```ts
api.delete(`/reservations/customer/${customerId}`)
```

## mobile-app/src/api/services.ts:541

```ts
api.post<Reservation>(`/reservations/${id}/transfer`, { to_customer_id: toCustomerId })
```

## mobile-app/src/api/services.ts:545

```ts
api.get<ReservationNotice[]>("/reservations/notices")
```

## mobile-app/src/api/services.ts:548

```ts
api.post(`/reservations/notices/${id}/ack`)
```

## mobile-app/src/api/services.ts:555

```ts
api.get<Expense[]>("/expenses")
```

## mobile-app/src/api/services.ts:565

```ts
api.post<Expense>("/expenses", payload)
```

## mobile-app/src/api/services.ts:572

```ts
api.put<Expense>(`/expenses/${id}`, payload)
```

## mobile-app/src/api/services.ts:576

```ts
api.delete(`/expenses/${id}`)
```

## mobile-app/src/api/services.ts:593

```ts
fetch(uri)
```

## mobile-app/src/api/services.ts:601

```ts
api.upload<{ url: string }>("/upload", formData)
```

## mobile-app/src/api/services.ts:619

```ts
api.get<{
        mode: string;
        storage: string;
        categoryCount: number;
        customerCount: number;
        equipmentCount: number;
        activeRentalCount: number;
        rentalHistoryCount: number;
        expenseCount: number;
        totalRecords: number;
        lastCheckedAt: string;
      }>("/stats")
```

## mobile-app/src/storage/files.ts:50

```ts
fetch(uri)
```

## mobile-app/src/utils/invoicePdf.ts:54

```ts
fetch(pdfUrl(rentalId), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
```
