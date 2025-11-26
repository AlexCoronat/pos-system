"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
    Plus,
    Search,
    Filter,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    MoreHorizontal,
    FileText,
    Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";

import { quotesService, QuoteWithDetails, QuoteFilters } from "@/lib/services/quotes.service";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { formatCurrency } from "@/lib/utils";

export default function QuotesPage() {
    const router = useRouter();
    const t = useTranslations("quotes");
    const tCommon = useTranslations("common");
    const { toast } = useToast();

    const [quotes, setQuotes] = useState<QuoteWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalQuotes, setTotalQuotes] = useState(0);
    const pageSize = 20;

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
        converted: 0,
        totalValue: 0,
        conversionRate: 0
    });

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadQuotes = async () => {
        setIsLoading(true);
        try {
            const filters: QuoteFilters = {};

            if (searchTerm) {
                filters.search = searchTerm;
            }

            if (statusFilter !== "all") {
                filters.status = statusFilter as any;
            }

            const response = await quotesService.getQuotes(filters, currentPage, pageSize);
            setQuotes(response.quotes);
            setTotalPages(response.totalPages);
            setTotalQuotes(response.total);

            // Load stats
            const statsData = await quotesService.getQuoteStats();
            setStats(statsData);

        } catch (error: any) {
            console.error("Error loading quotes:", error);
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.loadError")
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadQuotes();
    }, [currentPage, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        loadQuotes();
    };

    const handleDeleteClick = (quote: QuoteWithDetails) => {
        setQuoteToDelete(quote);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!quoteToDelete) return;

        setIsDeleting(true);
        try {
            await quotesService.deleteQuote(quoteToDelete.id);
            toast({
                title: tCommon("success"),
                description: t("messages.deleted")
            });
            loadQuotes();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: tCommon("error"),
                description: t("messages.deleteError")
            });
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setQuoteToDelete(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("subtitle")}
                    </p>
                </div>
                <Link href="/dashboard/quotes/new">
                    <Button size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        {t("newQuote")}
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("stats.totalQuotes")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(stats.totalValue)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("stats.pendingQuotes")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {stats.pending}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("stats.acceptedQuotes")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.accepted}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("stats.convertedQuotes")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.converted}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats.conversionRate}% {t("labels.conversion")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        {t("filters.title")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={t("filters.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("filters.status")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                                <SelectItem value="draft">{t("status.draft")}</SelectItem>
                                <SelectItem value="pending">{t("status.pending")}</SelectItem>
                                <SelectItem value="sent">{t("status.sent")}</SelectItem>
                                <SelectItem value="accepted">{t("status.accepted")}</SelectItem>
                                <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
                                <SelectItem value="expired">{t("status.expired")}</SelectItem>
                                <SelectItem value="converted">{t("status.converted")}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button type="submit">
                            <Search className="h-4 w-4 mr-2" />
                            {t("filters.search")}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={loadQuotes}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t("filters.refresh")}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Quotes Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {tCommon("loading")}
                        </div>
                    ) : quotes.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {t("messages.noQuotesFound")}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("table.number")}</TableHead>
                                        <TableHead>{t("table.date")}</TableHead>
                                        <TableHead>{t("table.customer")}</TableHead>
                                        <TableHead>{t("table.expiry")}</TableHead>
                                        <TableHead className="text-right">{t("table.total")}</TableHead>
                                        <TableHead>{t("table.status")}</TableHead>
                                        <TableHead className="text-right">{t("table.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quotes.map((quote) => (
                                        <TableRow key={quote.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {quote.quote_number}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(quote.quote_date), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                {quote.customer ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {quote.customer.first_name} {quote.customer.last_name}
                                                        </span>
                                                        {quote.customer.business_name && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {quote.customer.business_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {quote.expiry_date && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                                        {format(new Date(quote.expiry_date), "dd/MM/yyyy")}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(quote.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <QuoteStatusBadge status={quote.status} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => router.push(`/dashboard/quotes/${quote.id}`)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            {t("actions.view")}
                                                        </DropdownMenuItem>
                                                        {['draft', 'pending', 'sent'].includes(quote.status) && (
                                                            <DropdownMenuItem
                                                                onClick={() => router.push(`/dashboard/quotes/${quote.id}?edit=true`)}
                                                            >
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                {t("actions.edit")}
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => handleDeleteClick(quote)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            {t("actions.delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                {tCommon("page")} {currentPage} {tCommon("of")} {totalPages} ({totalQuotes} {t("labels.quotesCount")})
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    {tCommon("previous")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    {tCommon("next")}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tCommon("confirm")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("messages.confirmDelete")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t("messages.deleting") : tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
