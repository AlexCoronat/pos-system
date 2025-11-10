/**
 * Servicio para llamar a Supabase Edge Functions
 * Maneja la lógica de negocio compleja del POS
 * Sistema POS para Papelería
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { SupabaseErrorHandler } from '../utils/supabase-error.handler';
import { EDGE_FUNCTIONS, TIMEOUTS } from '../utils/constants';
import {
  CreateSaleDTO,
  CreateQuoteDTO,
  ConvertQuoteToSaleDTO,
  InventoryAdjustmentDTO,
  Sale,
  Quote,
} from '../models/database.types';

/**
 * Respuesta genérica de Edge Function
 */
interface EdgeFunctionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Parámetros para procesar pago con Mercado Pago
 */
interface MercadoPagoPaymentParams {
  saleId: number;
  amount: number;
  paymentMethodId: string;
  email: string;
  installments?: number;
  description?: string;
}

/**
 * Respuesta de procesamiento de pago
 */
interface PaymentProcessResponse {
  paymentId: string;
  status: string;
  statusDetail?: string;
  transactionId: number;
}

/**
 * Servicio de Edge Functions
 */
@Injectable({
  providedIn: 'root'
})
export class EdgeFunctionsService {

  constructor(
    private supabase: SupabaseService,
    private errorHandler: SupabaseErrorHandler
  ) {}

  /**
   * Método genérico para invocar una Edge Function
   */
  private invoke<T>(
    functionName: string,
    params?: Record<string, any>
  ): Observable<T> {
    return from(
      this.supabase.client.functions.invoke<EdgeFunctionResponse<T>>(functionName, {
        body: params,
      })
    ).pipe(
      timeout(TIMEOUTS.EDGE_FUNCTION),
      map(({ data, error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, `Edge Function: ${functionName}`);
        }

        if (!data || !data.success) {
          throw new Error(data?.error || data?.message || 'Error en Edge Function');
        }

        return data.data as T;
      }),
      catchError((error) => {
        throw this.errorHandler.handleError(error, `Edge Function: ${functionName}`);
      })
    );
  }

  // ============================================
  // VENTAS
  // ============================================

  /**
   * Crea una venta completa con validaciones y actualización de inventario
   * Esta función maneja toda la lógica transaccional
   */
  createSale(saleData: CreateSaleDTO): Observable<Sale> {
    return this.invoke<Sale>(EDGE_FUNCTIONS.CREATE_SALE, saleData);
  }

  /**
   * Procesa un pago para una venta existente
   */
  processPayment(params: {
    saleId: number;
    paymentMethodId: number;
    amount: number;
    referenceNumber?: string;
  }): Observable<PaymentProcessResponse> {
    return this.invoke<PaymentProcessResponse>(
      EDGE_FUNCTIONS.PROCESS_PAYMENT,
      params
    );
  }

  /**
   * Procesa un reembolso
   */
  processRefund(params: {
    saleId: number;
    refundAmount?: number;
    refundType: 'full' | 'partial' | 'exchange';
    reason?: string;
    notes?: string;
  }): Observable<any> {
    return this.invoke(EDGE_FUNCTIONS.PROCESS_REFUND, params);
  }

  // ============================================
  // COTIZACIONES
  // ============================================

  /**
   * Convierte una cotización a venta
   * Valida stock, reserva inventario y crea la venta
   */
  convertQuoteToSale(data: ConvertQuoteToSaleDTO): Observable<Sale> {
    return this.invoke<Sale>(EDGE_FUNCTIONS.CONVERT_QUOTE_TO_SALE, data);
  }

  // ============================================
  // INVENTARIO
  // ============================================

  /**
   * Ajusta el inventario de un producto
   * Puede ser para corrección, pérdida, daño, etc.
   */
  adjustInventory(adjustment: InventoryAdjustmentDTO): Observable<any> {
    return this.invoke(EDGE_FUNCTIONS.ADJUST_INVENTORY, adjustment);
  }

  /**
   * Transfiere inventario entre ubicaciones
   */
  transferInventory(params: {
    productId: number;
    fromLocationId: number;
    toLocationId: number;
    quantity: number;
    notes?: string;
  }): Observable<any> {
    return this.invoke(EDGE_FUNCTIONS.TRANSFER_INVENTORY, params);
  }

  // ============================================
  // MERCADO PAGO
  // ============================================

  /**
   * Procesa un pago con Mercado Pago
   */
  processMercadoPagoPayment(params: MercadoPagoPaymentParams): Observable<PaymentProcessResponse> {
    return this.invoke<PaymentProcessResponse>(
      EDGE_FUNCTIONS.PROCESS_MP_PAYMENT,
      params
    );
  }

  /**
   * Webhook de Mercado Pago (normalmente manejado por backend)
   * Esta función se puede usar para debugging o pruebas
   */
  handleMercadoPagoWebhook(webhookData: any): Observable<any> {
    return this.invoke(EDGE_FUNCTIONS.HANDLE_MP_WEBHOOK, webhookData);
  }

  // ============================================
  // REPORTES
  // ============================================

  /**
   * Genera un reporte de ventas
   */
  generateSalesReport(params: {
    startDate: Date;
    endDate: Date;
    locationId?: number;
    userId?: string;
    groupBy?: 'day' | 'week' | 'month' | 'product' | 'category';
  }): Observable<any> {
    return this.invoke(EDGE_FUNCTIONS.GENERATE_SALES_REPORT, {
      ...params,
      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString(),
    });
  }

  /**
   * Genera un reporte de inventario
   */
  generateInventoryReport(params: {
    locationId?: number;
    categoryId?: number;
    lowStockOnly?: boolean;
    includeMovements?: boolean;
  }): Observable<any> {
    return this.invoke(EDGE_FUNCTIONS.GENERATE_INVENTORY_REPORT, params);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Ejecuta una Edge Function personalizada
   * Útil para funciones no contempladas en este servicio
   */
  executeCustomFunction<T>(
    functionName: string,
    params?: Record<string, any>
  ): Observable<T> {
    return this.invoke<T>(functionName, params);
  }

  /**
   * Verifica el estado de una Edge Function
   */
  async checkFunctionHealth(functionName: string): Promise<boolean> {
    try {
      const response = await this.supabase.client.functions.invoke(functionName, {
        body: { action: 'health-check' },
      });
      return !response.error;
    } catch {
      return false;
    }
  }
}
