"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { QuoteForm } from "@/components/quotes/QuoteForm";
import { customerService } from "@/lib/services/customer.service";
import { productService } from "@/lib/services/product.service";
import { quotesService, CreateQuoteData } from "@/lib/services/quotes.service";
import { Customer } from "@/lib/types/customer";
import { Product } from "@/lib/types/product";
import { getBusinessContext } from "@/lib/utils/business-context";

export default function NewQuotePage() {
    const router = useRouter();
    const t = useTranslations("quotes");
    const tCommon = useTranslations("common");
    const { toast } = useToast();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationId, setLocationId] = useState<number | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get business context to obtain location_id and user_id
                const context = await getBusinessContext();
                setUserId(context.userId);

                // If no default location, get the first active location
                if (context.defaultLocationId) {
                    setLocationId(context.defaultLocationId);
                } else {
                    // Import location service to get first location
                    const { locationService } = await import("@/lib/services/location.service");
                    const locationsResponse = await locationService.getLocations({ isActive: true }, 1, 1);

                    if (locationsResponse.locations.length > 0) {
                        setLocationId(locationsResponse.locations[0].id);
                    } else {
                        toast({
                            variant: "destructive",
                            title: tCommon("error"),
                            description: "No active locations found. Please create a location first."
                        });
                    }
                }

                // Fetch active customers
                // Note: In a real app with many customers, we should implement server-side search
                const customersResponse = await customerService.getCustomers({ isActive: true }, 1, 100);

                // Fetch active products
                const productsResponse = await productService.getProducts({ isActive: true }, 1, 100);

                // Map ProductWithPrice to Product structure
                const mappedProducts: Product[] = productsResponse.products.map((p) => ({
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
            } catch (error) {
                console.error("Error loading data:", error);
                toast({
                    variant: "destructive",
                    title: tCommon("error"),
                    description: t("messages.loadDataError")
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (data: CreateQuoteData) => {
        if (!locationId) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: "No location selected"
            });
            return;
        }

        if (!userId) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: "User not authenticated"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Add location_id and created_by to the quote data
            const quoteData = {
                ...data,
                location_id: locationId,
                created_by: userId
            };

            await quotesService.createQuote(quoteData);
            toast({
                title: tCommon("success"),
                description: t("messages.created")
            });
            router.push("/dashboard/quotes");
        } catch (error: any) {
            console.error("Error creating quote:", error);
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.createError")
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">{tCommon("loading")}</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold">{t("newQuote")}</h1>
            </div>

            <Card>
                <CardContent className="p-6">
                    <QuoteForm
                        customers={customers}
                        products={products}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
