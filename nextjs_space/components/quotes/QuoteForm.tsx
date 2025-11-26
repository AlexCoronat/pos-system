"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { QuoteItemsTable } from "./QuoteItemsTable";
import { Quote, QuoteItem, CreateQuoteData } from "@/lib/services/quotes.service";
import { Customer } from "@/lib/types/customer";
import { Product } from "@/lib/types/product";

interface QuoteTotals {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
}

const quoteSchema = z.object({
    customer_id: z.string().optional(),
    quote_date: z.date(),
    expiry_date: z.date(),
    notes: z.string().nullish(),
    internal_notes: z.string().nullish(),
    terms_and_conditions: z.string().nullish(),
    items: z.array(z.object({
        product_id: z.number(),
        quantity: z.number().min(0.01),
        unit_price: z.number().min(0),
        discount_amount: z.number().min(0).optional(),
        tax_rate: z.number().min(0).optional(),
        tax_amount: z.number().optional(),
        subtotal: z.number(),
        notes: z.string().nullish()
    })).min(1, "At least one item is required")
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
    initialData?: Quote;
    customers: Customer[];
    products: Product[];
    onSubmit: (data: CreateQuoteData) => Promise<void>;
    isSubmitting?: boolean;
}

export function QuoteForm({ initialData, customers, products, onSubmit, isSubmitting = false }: QuoteFormProps) {
    const t = useTranslations("quotes.form");
    const tCommon = useTranslations("common");
    const tMessages = useTranslations("quotes.messages");
    const { toast } = useToast();

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteSchema),
        defaultValues: {
            customer_id: initialData?.customer_id?.toString() || "",
            quote_date: initialData?.quote_date ? new Date(initialData.quote_date) : new Date(),
            expiry_date: initialData?.expiry_date ? new Date(initialData.expiry_date) : new Date(new Date().setDate(new Date().getDate() + 15)),
            notes: initialData?.notes || "",
            internal_notes: initialData?.internal_notes || "",
            terms_and_conditions: initialData?.terms_and_conditions || "",
            items: initialData?.items || []
        }
    });

    const [items, setItems] = useState<Partial<QuoteItem>[]>(initialData?.items || []);

    const handleItemsUpdate = (newItems: Partial<QuoteItem>[]) => {
        setItems(newItems);
        form.setValue("items", newItems as any, { shouldValidate: true });
    };

    const calculateTotals = (): QuoteTotals => {
        return items.reduce<QuoteTotals>((acc, item) => {
            const subtotal = Number(item.subtotal) || 0;
            const discount = Number(item.discount_amount) || 0;
            const tax = Number(item.tax_amount) || 0;

            acc.subtotal += subtotal;
            acc.discount += discount;
            acc.tax += tax;
            acc.total += (subtotal - discount + tax);
            return acc;
        }, { subtotal: 0, discount: 0, tax: 0, total: 0 });
    };

    const totals = calculateTotals();

    const handleSubmit = async (values: QuoteFormValues, status?: 'draft' | 'sent') => {
        console.log("QuoteForm handleSubmit called:", { values, status, isEditing: !!initialData });
        try {
            // When editing, preserve existing status unless explicitly changed
            const finalStatus = initialData && !status ? (initialData.status as any) : (status || 'draft');
            console.log("Final status:", finalStatus);

            const submitData: CreateQuoteData = {
                customer_id: values.customer_id && values.customer_id.trim() !== '' ? parseInt(values.customer_id) : undefined,
                quote_date: values.quote_date.toISOString(),
                expiry_date: values.expiry_date.toISOString(),
                status: finalStatus,
                notes: values.notes ?? undefined,
                internal_notes: values.internal_notes ?? undefined,
                terms_and_conditions: values.terms_and_conditions ?? undefined,
                items: values.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_amount: item.discount_amount || 0,
                    tax_rate: item.tax_rate || 16,
                    notes: item.notes ?? undefined
                })),
            };

            console.log("Submitting data:", submitData);
            await onSubmit(submitData);
            console.log("Submit completed successfully");
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: tMessages("createError")
            });
        }
    };

    return (
        <Form {...form}>
            <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Selection */}
                    <FormField
                        control={form.control}
                        name="customer_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("customer")} ({tCommon("optional")})</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("selectCustomer")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {customers.map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id.toString()}>
                                                {customer.firstName} {customer.lastName} {customer.businessName ? `(${customer.businessName})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="quote_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("date")}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>{t("date")}</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="expiry_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("expiryDate")}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>{t("expiryDate")}</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date()
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Items Table */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">{t("items")}</h3>
                    </div>
                    <QuoteItemsTable
                        items={items}
                        onUpdate={handleItemsUpdate}
                        products={products}
                    />
                    {form.formState.errors.items && (
                        <p className="text-sm font-medium text-destructive">
                            {form.formState.errors.items.message}
                        </p>
                    )}
                </div>

                {/* Totals & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("notes")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("notesPlaceholder")}
                                            className="resize-none"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="terms_and_conditions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("terms")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("termsPlaceholder")}
                                            className="resize-none"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="internal_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("internalNotes")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("internalNotesPlaceholder")}
                                            className="resize-none"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="bg-muted/50 p-6 rounded-lg space-y-4 h-fit">
                        <h4 className="font-semibold text-lg border-b pb-2">{tCommon("summary")}</h4>

                        <div className="flex justify-between text-sm">
                            <span>{t("subtotal")}</span>
                            <span>${totals.subtotal.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t("discount")}</span>
                            <span>-${totals.discount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t("tax")} (16%)</span>
                            <span>${totals.tax.toFixed(2)}</span>
                        </div>

                        <div className="border-t pt-4 flex justify-between font-bold text-lg">
                            <span>{t("total")}</span>
                            <span>${totals.total.toFixed(2)}</span>
                        </div>

                        <div className="pt-6 space-y-3">
                            {!initialData && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    disabled={isSubmitting}
                                    onClick={form.handleSubmit((values) => handleSubmit(values, 'draft'))}
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {t("saveDraft")}
                                </Button>
                            )}

                            <Button
                                type="button"
                                className="w-full"
                                disabled={isSubmitting}
                                onClick={() => {
                                    console.log("Update button clicked");
                                    console.log("Form errors:", form.formState.errors);
                                    console.log("Form values:", form.getValues());
                                    form.handleSubmit(
                                        (values) => handleSubmit(values, initialData ? undefined : 'sent'),
                                        (errors) => console.error("Form validation failed:", errors)
                                    )();
                                }}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {initialData ? t("update") : t("create")}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </Form>
    );
}
