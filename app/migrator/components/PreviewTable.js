import React, { useState } from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

const PreviewTable = ({ data }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const headers = Object.keys(data[0]);
    const totalRecords = data.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = data.slice(startIndex, startIndex + pageSize);

    const handlePageSizeChange = (value) => {
        setPageSize(Number(value));
        setCurrentPage(1);
    };

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                        <tr>
                            {headers.map(key => (
                                <th key={key} className="px-4 py-3 font-semibold tracking-wider whitespace-nowrap text-slate-700">{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {paginatedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                                {headers.map((key, i) => (
                                    <td key={i} className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[200px] truncate" title={String(row[key])}>
                                        {String(row[key])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Standardized Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5">
                <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Show</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={handlePageSizeChange}
                        >
                            <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs text-slate-700 shadow-none rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 20, 50].map(size => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">per page</span>
                    </div>

                    <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                        Showing <span className="text-foreground">{startIndex + 1}</span> to{' '}
                        <span className="text-foreground">{Math.min(currentPage * pageSize, totalRecords)}</span> of{' '}
                        <span className="text-foreground">{totalRecords}</span> entries
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                        <Pagination className="w-auto mx-0">
                            <PaginationContent>
                                <PaginationItem>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage(prev => Math.max(prev - 1, 1));
                                        }}
                                        disabled={currentPage === 1}
                                        className="gap-1 pl-2.5 h-8 rounded-lg"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span>Previous</span>
                                    </Button>
                                </PaginationItem>

                                {(() => {
                                    const pages = [];
                                    const maxVisiblePages = 3;
                                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                    if (endPage - startPage + 1 < maxVisiblePages) {
                                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                        pages.push(
                                            <PaginationItem key={i}>
                                                <PaginationLink
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCurrentPage(i);
                                                    }}
                                                    isActive={currentPage === i}
                                                    className="cursor-pointer h-8 w-8 rounded-lg"
                                                >
                                                    {i}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    }
                                    return pages;
                                })()}

                                <PaginationItem>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                        }}
                                        disabled={currentPage === totalPages}
                                        className="gap-1 pr-2.5 h-8 rounded-lg"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewTable;