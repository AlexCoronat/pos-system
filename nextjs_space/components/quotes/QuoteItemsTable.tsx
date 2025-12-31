"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { QuoteItem } from "@/lib/services/quotes.service";
import { Product } from "@/lib/types/product";
import { formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface QuoteItemsTableProps {
    items: Partial<QuoteItem>[];
    onUpdate: (items: Partial<QuoteItem>[]) => void;
    readOnly?: boolean;
    products?: Product[]; // List of available products for selection
    currency?: string;
}

export function QuoteItemsTable({
    items,
    onUpdate,
    readOnly = false,
    products = [],
    currency = "MXN"
}: QuoteItemsTableProps) {
    const t = useTranslations("quotes.items");
    const [openSearch, setOpenSearch] = useState(false);

    const handleAddItem = (product: Product) => {
        const newItem: Partial<QuoteItem> = {
            product_id: product.id,
            quantity: 1,
            unit_price: product.sellingPrice || 0,
            discount_amount: 0,
            tax_rate: product.taxRate || 16, // Default tax rate
            tax_amount: 0,
            subtotal: product.sellingPrice || 0,
        };

        // Calculate initial totals
        calculateItemTotals(newItem);

        onUpdate([...items, newItem]);
        setOpenSearch(false);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onUpdate(newItems);
    };

    const handleUpdateItem = (index: number, field: keyof QuoteItem, value: number) => {
        const newItems = [...items];
        const item = { ...newItems[index] };

        // Update field
        (item as any)[field] = value;

        // Recalculate totals
        calculateItemTotals(item);

        newItems[index] = item;
        onUpdate(newItems);
    };

    const calculateItemTotals = (item: Partial<QuoteItem>) => {
        const quantity = Number(item.quantity) || 0;
        const unitPriceWithTax = Number(item.unit_price) || 0;
        const discount = Number(item.discount_amount) || 0;
        const taxRate = Number(item.tax_rate) || 0;

        // IMPORTANTE: unitPrice (sellingPrice) incluye el impuesto
        // Necesitamos extraer el precio sin impuesto
        const priceWithTax = quantity * unitPriceWithTax;
        const priceWithoutTax = priceWithTax / (1 + taxRate / 100);

        // El descuento se aplica sobre el precio sin impuesto
        const priceAfterDiscount = priceWithoutTax - discount;

        // Calcular impuesto sobre el precio después del descuento
        const tax = priceAfterDiscount * (taxRate / 100);

        // Subtotal es el precio sin impuesto (antes de descuento)
        item.subtotal = priceWithoutTax;
        item.tax_amount = tax;
    };

    // Helper to find product name
    const getProductName = (item: Partial<QuoteItem>) => {
        if (item.product?.name) return item.product.name;
        if (!item.product_id) return t("unknownProduct") || "Unknown Product";
        const product = products.find(p => p.id === item.product_id);
        return product ? product.name : `Product #${item.product_id}`;
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">{t("product")}</TableHead>
                            <TableHead className="w-[100px]">{t("quantity")}</TableHead>
                            <TableHead className="w-[120px]">{t("price")}</TableHead>
                            <TableHead className="w-[100px]">{t("discount")}</TableHead>
                            <TableHead className="w-[80px]">{t("tax")} %</TableHead>
                            <TableHead className="w-[120px] text-right">{t("total")}</TableHead>
                            {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => {
                            const lineTotal = (Number(item.subtotal) || 0) - (Number(item.discount_amount) || 0) + (Number(item.tax_amount) || 0);

                            // El unit_price incluye impuesto, calcular precio sin impuesto para mostrar
                            const taxRate = Number(item.tax_rate) || 16;
                            const unitPriceWithoutTax = (Number(item.unit_price) || 0) / (1 + taxRate / 100);

                            return (
                                <TableRow key={index}>
                                    <TableCell>
                                        {readOnly ? (
                                            <span>{getProductName(item)}</span>
                                        ) : (
                                            <div className="font-medium">{getProductName(item)}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {readOnly ? (
                                            item.quantity
                                        ) : (
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(index, "quantity", parseFloat(e.target.value))}
                                                className="w-20"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {readOnly ? (
                                            formatCurrency(unitPriceWithoutTax)
                                        ) : (
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => handleUpdateItem(index, "unit_price", parseFloat(e.target.value))}
                                                className="w-24"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {readOnly ? (
                                            formatCurrency(item.discount_amount || 0)
                                        ) : (
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.discount_amount}
                                                onChange={(e) => handleUpdateItem(index, "discount_amount", parseFloat(e.target.value))}
                                                className="w-20"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {readOnly ? (
                                            `${item.tax_rate}%`
                                        ) : (
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.tax_rate}
                                                onChange={(e) => handleUpdateItem(index, "tax_rate", parseFloat(e.target.value))}
                                                className="w-16"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(lineTotal)}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-destructive hover:text-destructive/90"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={readOnly ? 6 : 7} className="h-24 text-center text-muted-foreground">
                                    {t("noItems")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {!readOnly && (
                <Popover open={openSearch} onOpenChange={setOpenSearch}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-muted-foreground">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("searchProduct")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                        <Command>
                            <CommandInput placeholder={t("searchProduct")} />
                            <CommandList>
                                <CommandEmpty>{t("noProducts")}</CommandEmpty>
                                <CommandGroup>
                                    {products.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => handleAddItem(product)}
                                        >
                                            <div className="flex w-full justify-between items-center">
                                                <span>{product.name}</span>
                                                <span className="text-muted-foreground text-sm">
                                                    {formatCurrency(product.sellingPrice || 0)}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
