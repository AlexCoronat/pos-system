"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Edit, Trash2, FileText, CheckCircle, XCircle, Send, ShoppingCart, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pdf } from "@react-pdf/renderer";
import { QuoteDocument } from "@/components/quotes/QuoteDocument";
import { useBranding } from "@/lib/contexts/BrandingContext";
import { useAuth } from "@/lib/hooks/use-auth";

import { BrandButton } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuoteItemsTable } from "@/components/quotes/QuoteItemsTable";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { customerService } from "@/lib/services/customer.service";
import { productService } from "@/lib/services/product.service";
import { quotesService, QuoteWithDetails, CreateQuoteData } from "@/lib/services/quotes.service";
import { Customer } from "@/lib/types/customer";
import { Product } from "@/lib/types/product";
import { formatCurrency } from "@/lib/utils";
import { getBusinessContext } from "@/lib/utils/business-context";

export default function QuoteDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const t = useTranslations("quotes");
    const tCommon = useTranslations("common");
    const { toast } = useToast();
    const { branding } = useBranding();
    const { user } = useAuth();

    const id = params.id as string;
    const isEditMode = searchParams.get("edit") === "true";

    const [quote, setQuote] = useState<QuoteWithDetails | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch quote details
                const quoteData = await quotesService.getQuoteById(parseInt(id));
                setQuote(quoteData);

                // If in edit mode, fetch customers and products
                if (isEditMode) {
                    const customersResponse = await customerService.getCustomers({ isActive: true }, 1, 100);
                    const productsResponse = await productService.getProducts({ isActive: true }, 1, 100);

                    // Map ProductWithPrice to Product structure
                    const mappedProducts: Product[] = productsResponse.products.map((p: any) => ({
                        id: p.id,
                        sku: p.sku,
                        name: p.name,
                        description: p.description,
                        categoryId: p.categoryId,
                        categoryName: p.categoryName,
                        isActive: p.isActive,
                        imageUrl: p.imageUrl,
                        barcode: p.barcode,
                        unit: p.unit,
                        costPrice: p.price?.costPrice,
                        sellingPrice: p.price?.salePrice,
                        taxRate: p.taxRate,
                        isTaxable: p.isTaxable,
                        hasVariants: p.hasVariants,
                        metadata: p.metadata,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt
                    }));

                    setCustomers(customersResponse.customers as unknown as Customer[]);
                    setProducts(mappedProducts);
                }
            } catch (error) {
                console.error("Error loading data:", error);
                toast({
                    variant: "destructive",
                    title: tCommon("error"),
                    description: t("messages.loadDetailError")
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, isEditMode]);

    const handleUpdate = async (data: CreateQuoteData) => {
        console.log("handleUpdate called with data:", data);
        setIsSubmitting(true);
        try {
            // Ensure location_id is set (use existing or get from context)
            let location_id = data.location_id;
            if (!location_id && quote?.location_id) {
                location_id = quote.location_id;
            } else if (!location_id) {
                // Get from business context as fallback
                const context = await getBusinessContext();
                location_id = context.defaultLocationId;
            }

            // Convert CreateQuoteData to UpdateQuoteData
            const updateData = {
                customer_id: data.customer_id,
                location_id: location_id,
                quote_date: data.quote_date,
                expiry_date: data.expiry_date,
                status: data.status,
                notes: data.notes,
                internal_notes: data.internal_notes,
                terms_and_conditions: data.terms_and_conditions,
                items: data.items
            };

            console.log("Calling updateQuote with:", { id: parseInt(id), updateData });
            await quotesService.updateQuote(parseInt(id), updateData);
            console.log("Update successful");

            toast({
                title: tCommon("success"),
                description: t("messages.updated")
            });
            // Refresh and exit edit mode
            router.push(`/dashboard/quotes/${id}`);
            router.refresh();
        } catch (error: any) {
            console.error("Error updating quote:", error);
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.updateError")
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await quotesService.deleteQuote(parseInt(id));
            toast({
                title: tCommon("success"),
                description: t("messages.deleted")
            });
            router.push("/dashboard/quotes");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.deleteError")
            });
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await quotesService.changeStatus(parseInt(id), newStatus as any);
            toast({
                title: tCommon("success"),
                description: t("messages.statusChanged")
            });
            // Refresh local state
            const updatedQuote = await quotesService.getQuoteById(parseInt(id));
            setQuote(updatedQuote);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.statusChangeError")
            });
        }
    };

    const handleConvertToSale = async () => {
        try {
            await quotesService.convertToSale(parseInt(id));
            toast({
                title: tCommon("success"),
                description: t("messages.converted")
            });
            setConvertDialogOpen(false);
            // Refresh
            const updatedQuote = await quotesService.getQuoteById(parseInt(id));
            setQuote(updatedQuote);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.convertError")
            });
        }
    };

    const handleDownloadPDF = async () => {
        if (!quote) return;

        try {
            setIsPdfLoading(true);

            // Prepare strings for PDF
            const strings = {
                quote: t("title"),
                quoteNumber: t("form.quoteNumber"),
                date: t("form.date"),
                expiryDate: t("form.expiryDate"),
                customer: t("form.customer"),
                product: t("items.product"),
                quantity: t("items.quantity"),
                unitPrice: t("items.price"),
                discount: t("form.discount"),
                tax: t("form.tax"),
                total: t("form.total"),
                subtotal: t("form.subtotal"),
                notes: t("form.notes"),
                terms: t("form.terms"),
                deliveryTime: t("labels.deliveryTime"),
                status: t("labels.status"),
                signature: "Firma del Cliente",
                acceptanceText: "Al firmar, acepto los términos y condiciones de esta cotización.",
                validUntil: "Válida hasta",
                thankYou: "¡Gracias por su preferencia!"
            };

            // Company info
            const companyInfo = {
                name: user?.businessName || 'Mi Empresa',
                address: '',
                phone: '',
                email: ''
            };

            // Generate PDF blob
            const blob = await pdf(
                <QuoteDocument
                    quote={{
                        quote_number: quote.quote_number,
                        quote_date: quote.quote_date,
                        expiry_date: quote.expiry_date,
                        status: quote.status,
                        customer: quote.customer,
                        items: quote.items || [],
                        subtotal: quote.subtotal,
                        discount_amount: quote.discount_amount,
                        tax_amount: quote.tax_amount,
                        total_amount: quote.total_amount,
                        notes: quote.notes,
                        terms_and_conditions: quote.terms_and_conditions,
                        delivery_time: quote.delivery_time
                    }}
                    companyInfo={companyInfo}
                    primaryColor={branding.primaryColor}
                    strings={strings}
                />
            ).toBlob();

            // Download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cotizacion-${quote.quote_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: "Error al generar el PDF"
            });
        } finally {
            setIsPdfLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">{tCommon("loading")}</div>;
    }

    if (!quote) {
        return <div className="p-8 text-center">{t("messages.notFound")}</div>;
    }

    if (isEditMode) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <BrandButton variant="ghost" size="sm" onClick={() => router.push(`/dashboard/quotes/${id}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </BrandButton>
                    <h1 className="text-3xl font-bold">{t("editQuote")}</h1>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <QuoteForm
                            initialData={quote}
                            customers={customers}
                            products={products}
                            onSubmit={handleUpdate}
                            isSubmitting={isSubmitting}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <BrandButton variant="ghost" size="sm" onClick={() => router.push("/dashboard/quotes")}>
                        <ArrowLeft className="h-4 w-4" />
                    </BrandButton>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold">{quote.quote_number}</h1>
                            <QuoteStatusBadge status={quote.status} />
                        </div>
                        <p className="text-muted-foreground">
                            {t("labels.created")}: {format(new Date(quote.quote_date), "PPP")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {['draft', 'pending', 'sent'].includes(quote.status) && (
                        <BrandButton variant="outline" onClick={() => router.push(`/dashboard/quotes/${id}?edit=true`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                        </BrandButton>
                    )}

                    {quote.status === 'draft' && (
                        <BrandButton onClick={() => handleStatusChange('sent')}>
                            <Send className="h-4 w-4 mr-2" />
                            {t("actions.markSent")}
                        </BrandButton>
                    )}

                    {quote.status === 'sent' && (
                        <>
                            <BrandButton variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleStatusChange('accepted')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t("actions.markAccepted")}
                            </BrandButton>
                            <BrandButton variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleStatusChange('rejected')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.markRejected")}
                            </BrandButton>
                        </>
                    )}

                    {quote.status === 'accepted' && (
                        <BrandButton onClick={() => setConvertDialogOpen(true)}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {t("actions.convertToSale")}
                        </BrandButton>
                    )}

                    <BrandButton variant="outline" onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" />
                        {t("actions.downloadPdf")}
                    </BrandButton>

                    <BrandButton variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4" />
                    </BrandButton>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("form.customer")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {quote.customer ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-medium text-lg">
                                            {quote.customer.firstName} {quote.customer.lastName}
                                        </p>
                                        {quote.customer.businessName && (
                                            <p className="text-muted-foreground">{quote.customer.businessName}</p>
                                        )}
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <p>{quote.customer.email}</p>
                                        <p>{quote.customer.phone}</p>
                                        <p>{quote.customer.city}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">{t("labels.unknownCustomer")}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("form.items")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <QuoteItemsTable
                                items={quote.items || []}
                                onUpdate={() => { }}
                                readOnly={true}
                                products={[]} // Not needed for read-only
                            />
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    {(quote.notes || quote.terms_and_conditions) && (
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                {quote.notes && (
                                    <div>
                                        <h4 className="font-semibold mb-2">{t("form.notes")}</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                                    </div>
                                )}
                                {quote.notes && quote.terms_and_conditions && <Separator />}
                                {quote.terms_and_conditions && (
                                    <div>
                                        <h4 className="font-semibold mb-2">{t("form.terms")}</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.terms_and_conditions}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{tCommon("summary")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>{t("form.subtotal")}</span>
                                <span>{formatCurrency(quote.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{t("form.discount")}</span>
                                <span>-{formatCurrency(quote.discount_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{t("form.tax")}</span>
                                <span>{formatCurrency(quote.tax_amount)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>{t("form.total")}</span>
                                <span>{formatCurrency(quote.total_amount)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dates */}
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("form.date")}</p>
                                <p>{format(new Date(quote.quote_date), "PPP")}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("form.expiryDate")}</p>
                                <p>{quote.expiry_date ? format(new Date(quote.expiry_date), "PPP") : "-"}</p>
                            </div>
                            {quote.delivery_time && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t("labels.deliveryTime")}</p>
                                    <p>{quote.delivery_time}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tCommon("confirm")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("messages.confirmDelete")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("actions.convertToSale")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("messages.confirmConvert")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConvertToSale} className="bg-blue-600 hover:bg-blue-700">
                            {t("actions.convertToSale")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
