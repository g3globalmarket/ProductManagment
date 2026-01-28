"use client"

import { useState, useMemo, useEffect } from "react"
import { useProductStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Package, FileText, CheckCircle, Send, RefreshCw, Eye, EyeOff, AlertTriangle, DollarSign, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Product, Store } from "@/types/product"

type FlagFilter = "ALL" | "PRICE_CHANGED" | "OUT_OF_STOCK" | "HIDDEN"

export default function ImportDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const products = useProductStore((state) => state.products)
  const { toggleVisibility, runSourceCheckForPushedProducts, loadProducts, isInitialized } = useProductStore()

  const [searchQuery, setSearchQuery] = useState("")

  // Load products from API on mount if using API mode
  useEffect(() => {
    if (!isInitialized) {
      loadProducts()
    }
  }, [isInitialized, loadProducts])
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("ALL")
  const [storeFilter, setStoreFilter] = useState<Store | "ALL">("ALL")
  const [isChecking, setIsChecking] = useState(false)

  const stats = useMemo(() => {
    const total = products.length
    const drafts = products.filter((p) => p.lifecycleStatus === "DRAFT").length
    const ready = products.filter((p) => p.lifecycleStatus === "READY").length
    const pushed = products.filter((p) => p.lifecycleStatus === "PUSHED").length

    return { total, drafts, ready, pushed }
  }, [products])

  const pushedProducts = useMemo(() => {
    return products.filter((p) => p.lifecycleStatus === "PUSHED")
  }, [products])

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = pushedProducts.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        (p.title || p.nameMn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nameOriginal || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFlag =
        flagFilter === "ALL" ||
        (flagFilter === "PRICE_CHANGED" && p.sourcePriceChanged) ||
        (flagFilter === "OUT_OF_STOCK" && p.sourceOutOfStock) ||
        (flagFilter === "HIDDEN" && p.visibility === "hidden")

      const matchesStore = storeFilter === "ALL" || p.sourceStore === storeFilter

      return matchesSearch && matchesFlag && matchesStore
    })

    // Sort: flagged items first (out of stock > price changed > hidden), then by last checked
    filtered.sort((a, b) => {
      // Priority: out of stock > price changed > hidden > none
      const getFlagPriority = (p: Product) => {
        if (p.sourceOutOfStock) return 3
        if (p.sourcePriceChanged) return 2
        if (p.visibility === "hidden") return 1
        return 0
      }

      const priorityDiff = getFlagPriority(b) - getFlagPriority(a)
      if (priorityDiff !== 0) return priorityDiff

      // Then by last checked (most recent first)
      const aTime = a.sourceLastCheckedAt
        ? new Date(a.sourceLastCheckedAt).getTime()
        : 0
      const bTime = b.sourceLastCheckedAt
        ? new Date(b.sourceLastCheckedAt).getTime()
        : 0
      return bTime - aTime
    })

    return filtered
  }, [pushedProducts, searchQuery, flagFilter, storeFilter])

  const handleCheckSourceUpdates = async () => {
    setIsChecking(true)
    try {
      const result = await runSourceCheckForPushedProducts()
      toast({
        title: "Source Check Complete",
        description: `Checked ${result.checked} products: ${result.priceChanged} price changed, ${result.outOfStock} out of stock`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check source updates",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  const handleToggleVisibility = (id: string) => {
    toggleVisibility(id)
    const product = products.find((p) => p.id === id)
    toast({
      title: product?.visibility === "hidden" ? "Product Hidden" : "Product Unhidden",
      description: `Product visibility updated`,
    })
  }

  const getLastCheckedText = (product: Product) => {
    if (!product.sourceLastCheckedAt) return "Never"
    const date = new Date(product.sourceLastCheckedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage and import products from various stores
          </p>
        </div>
        <Link href="/import/new">
          <Button size="lg">Import Products</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All imported products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Push</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ready}</div>
            <p className="text-xs text-muted-foreground">Validated & ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pushed</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pushed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products in Database</CardTitle>
              <CardDescription>
                Manage pushed products and monitor source changes
              </CardDescription>
            </div>
            <Button
              onClick={handleCheckSourceUpdates}
              disabled={isChecking || pushedProducts.length === 0}
              variant="outline"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Source Updates
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pushedProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products in database yet</p>
              <p className="text-sm mb-4">Push products to add them to the database</p>
              <Link href="/import/new">
                <Button variant="outline">Import Products</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Input
                  placeholder="Search by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={flagFilter} onValueChange={(value) => setFlagFilter(value as FlagFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by flag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Flags</SelectItem>
                    <SelectItem value="PRICE_CHANGED">Price Changed</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                    <SelectItem value="HIDDEN">Hidden</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={storeFilter}
                  onValueChange={(value) => setStoreFilter(value as Store | "ALL")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Stores</SelectItem>
                    <SelectItem value="gmarket">Gmarket</SelectItem>
                    <SelectItem value="oliveyoung">Olive Young</SelectItem>
                    <SelectItem value="auction">Auction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredAndSortedProducts.length > 0 && (
                <div className="text-sm text-muted-foreground mb-2">
                  Showing {filteredAndSortedProducts.length} of {pushedProducts.length} products
                  {(() => {
                    const mostRecentCheck = filteredAndSortedProducts
                      .map((p) => p.sourceLastCheckedAt)
                      .filter(Boolean)
                      .sort()
                      .reverse()[0]
                    if (!mostRecentCheck) return null
                    const product = filteredAndSortedProducts.find((p) => p.sourceLastCheckedAt === mostRecentCheck)
                    return product ? (
                      <span className="ml-2">
                        • Last checked: {getLastCheckedText(product)}
                      </span>
                    ) : null
                  })()}
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Store / Category</TableHead>
                      <TableHead>Price (MNT)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No products match your filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            {(product.imagesFinal?.length ?? 0) > 0 ? (
                              <img
                                src={product.imagesFinal?.[0] || ''}
                                alt={product.title || product.nameMn || product.slug || 'Product'}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.title || product.nameMn || product.nameOriginal || product.slug}</p>
                              {product.brand && (
                                <p className="text-sm text-muted-foreground">{product.brand}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm capitalize">{product.sourceStore}</p>
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {(product.priceMnt || 0).toLocaleString()} MNT
                            </div>
                            {product.sourcePriceChanged && product.sourceLastCheckedPriceKrw && (
                              <div className="text-xs text-muted-foreground">
                                Source: {product.sourceLastCheckedPriceKrw.toLocaleString()} KRW
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <TooltipProvider>
                                {product.sourceOutOfStock && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Out of Stock
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Product is out of stock on source site</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {product.sourcePriceChanged && !product.sourceOutOfStock && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        Price Changed
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Price changed from {product.sourceBaselinePriceKrw?.toLocaleString()} KRW to{" "}
                                        {product.sourceLastCheckedPriceKrw?.toLocaleString()} KRW
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {product.visibility === "hidden" && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs">
                                        <EyeOff className="h-3 w-3 mr-1" />
                                        Hidden
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Product is hidden from public access</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleVisibility(product.id)}
                                title={product.visibility === "hidden" ? "Unhide" : "Hide"}
                              >
                                {product.visibility === "hidden" ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/import/new/${product.id}`)}
                              >
                                Open
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

