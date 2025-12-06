/**
 * Transfer Types
 * Types for inventory transfer system
 */

export type TransferType = 'manual' | 'pos_request'
export type TransferPriority = 'normal' | 'urgent'
export type TransferStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'in_transit'
    | 'received'
    | 'partially_received'
    | 'cancelled'
    | 'expired'

export interface TransferItem {
    id?: number
    transferId?: number
    productId: number
    productName?: string
    productSku?: string
    variantId?: number | null
    variantName?: string
    quantityRequested: number
    quantityApproved: number
    quantityShipped: number
    quantityReceived: number
    notes?: string
}

export interface Transfer {
    id: number
    transferNumber: string
    fromLocationId: number
    fromLocationName?: string
    toLocationId: number
    toLocationName?: string
    transferType: TransferType
    priority: TransferPriority
    originSaleId?: number | null
    status: TransferStatus

    // Users
    requestedBy: string
    requestedByName?: string
    approvedBy?: string | null
    approvedByName?: string
    rejectedBy?: string | null
    rejectedByName?: string
    shippedBy?: string | null
    shippedByName?: string
    receivedBy?: string | null
    receivedByName?: string

    // Timestamps
    requestedAt: Date
    expiresAt?: Date | null
    approvedAt?: Date | null
    rejectedAt?: Date | null
    shippedAt?: Date | null
    receivedAt?: Date | null

    // Notes
    requestNotes?: string
    rejectionReason?: string
    shippingNotes?: string
    receivingNotes?: string

    // Items
    items?: TransferItem[]

    businessId: number
    createdAt: Date
    updatedAt: Date
}

export interface CreateTransferData {
    fromLocationId: number
    toLocationId: number
    transferType: TransferType
    priority?: TransferPriority
    originSaleId?: number
    requestNotes?: string
    expiresAt?: Date
    items: {
        productId: number
        variantId?: number | null
        quantityRequested: number
        notes?: string
    }[]
}

export interface ApproveTransferData {
    items: {
        itemId: number
        quantityApproved: number
    }[]
}

export interface ShipTransferData {
    items: {
        itemId: number
        quantityShipped: number
    }[]
    shippingNotes?: string
}

export interface ReceiveTransferData {
    items: {
        itemId: number
        quantityReceived: number
    }[]
    receivingNotes?: string
}

export interface TransferFilters {
    status?: TransferStatus | TransferStatus[]
    fromLocationId?: number
    toLocationId?: number
    transferType?: TransferType
    priority?: TransferPriority
    dateFrom?: Date
    dateTo?: Date
}

export interface TransferListItem {
    id: number
    transferNumber: string
    fromLocationName: string
    toLocationName: string
    status: TransferStatus
    transferType: TransferType
    priority: TransferPriority
    itemCount: number
    totalQuantity: number
    requestedAt: Date
    expiresAt?: Date | null
    requestedByName: string
}
