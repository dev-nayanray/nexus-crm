// Shared types for PDF documents
export interface OrderItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
  total: number
}

export interface Order {
  id: string
  number: string
  status: string
  paymentStatus: string
  fulfillmentStatus?: string
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  shipping: number
  total: number
  paidAmount: number
  currency: string
  orderDate: Date | string
  dueDate?: Date | string | null
  notes?: string | null
  billingAddress?: string | null
  customer?: {
    name: string
    company: string
    email: string
    phone?: string | null
  }
  items: OrderItem[]
}

export interface QuotationItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
  total: number
}

export interface Quotation {
  id: string
  number: string
  status: string
  subject: string
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  currency: string
  validUntil?: Date | string | null
  sentAt?: Date | string | null
  acceptedAt?: Date | string | null
  notes?: string | null
  terms?: string | null
  createdAt: Date | string
  customer?: {
    name: string
    company: string
    email: string
    phone?: string | null
  }
  items: QuotationItem[]
}

export interface CompanyInfo {
  name: string
  email: string
  address: string
}
