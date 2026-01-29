"use client"

import { useState } from "react"
import { useProductStore } from "@/lib/store"
import { Store, STORE_CATEGORIES, ProductStatus } from "@/types/product"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Search, Loader2, AlertCircle, Save, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { ProductCardSkeleton } from "@/components/product-card-skeleton"
import { getDisplayTitle } from "@/lib/utils"

export default function ImportNewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [store, setStore] = useState<Store | "">("")
  const [category, setCategory] = useState<string>("")
  const [count, setCount] = useState(20)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "ALL">("ALL")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const {
    currentSearchResults,
    searchProducts,
    updateProductStatus,
    updateMultipleProductsStatus,
    validateProduct,
  } = useProductStore()

  const categories = store ? STORE_CATEGORIES[store as Store] : []

  const handleSearch = async () => {
    if (!store || !category) {
      toast({
        title: "Validation Error",
        description: "Please select both store and category",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      await searchProducts(store as Store, category, count)
      toast({
        title: "Search Complete",
        description: `Found ${count} products`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const filteredResults = currentSearchResults.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      getDisplayTitle(product).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.nameOriginal || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "ALL" || product.lifecycleStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleSaveDraft = (id: string) => {
    updateProductStatus(id, "DRAFT")
    toast({
      title: "Draft Saved",
      description: "Product saved as draft",
    })
  }

  const handlePush = (id: string) => {
    const product = currentSearchResults.find((p) => p.id === id)
    if (!product) return

    const validation = validateProduct(product)
    if (!validation.isValid) {
      toast({
        title: "Validation Failed",
        description: validation.errors.map((e) => e.message).join(", "),
        variant: "destructive",
      })
      return
    }

    updateProductStatus(id, "PUSHED")
    toast({
      title: "Pushed",
      description: "Product has been pushed",
    })
  }

  const handleBulkSaveDraft = () => {
    if (selectedIds.size === 0) return
    updateMultipleProductsStatus(Array.from(selectedIds), "DRAFT")
    toast({
      title: "Bulk Draft Saved",
      description: `${selectedIds.size} products saved as draft`,
    })
    setSelectedIds(new Set())
  }

  const handleBulkPush = () => {
    if (selectedIds.size === 0) return

    const productsToPush = currentSearchResults.filter((p) => selectedIds.has(p.id))
    const invalidProducts = productsToPush.filter(
      (p) => !validateProduct(p).isValid
    )

    if (invalidProducts.length > 0) {
      toast({
        title: "Validation Failed",
        description: `${invalidProducts.length} products failed validation`,
        variant: "destructive",
      })
      return
    }

    updateMultipleProductsStatus(Array.from(selectedIds), "PUSHED")
    toast({
      title: "Bulk Pushed",
      description: `${selectedIds.size} products have been pushed`,
    })
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredResults.map((p) => p.id)))
    }
  }

  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case "RAW":
        return "bg-gray-100 text-gray-800"
      case "DRAFT":
        return "bg-blue-100 text-blue-800"
      case "READY":
        return "bg-green-100 text-green-800"
      case "PUSHED":
        return "bg-purple-100 text-purple-800"
    }
  }

  const hasWarnings = (product: typeof currentSearchResults[0]) => {
    return (
      !getDisplayTitle(product) ||
      !(product.short_description || product.descriptionMn || product.detailed_description) ||
      !product.brand ||
      (product.imagesFinal?.length ?? 0) === 0
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Products</h1>
          <p className="text-muted-foreground mt-1">
            Search and import products from stores
          </p>
        </div>
        <Link href="/import">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Products</CardTitle>
          <CardDescription>Select store, category, and count to search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="store">Store</Label>
              <Select value={store} onValueChange={(value) => {
                setStore(value as Store)
                setCategory("")
              }}>
                <SelectTrigger id="store">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmarket">Gmarket</SelectItem>
                  <SelectItem value="oliveyoung">Olive Young</SelectItem>
                  <SelectItem value="auction">Auction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={!store}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
          </div>

          <Button
            className="mt-4"
            onClick={handleSearch}
            disabled={isSearching || !store || !category}
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isSearching && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {currentSearchResults.length > 0 && !isSearching && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProductStatus | "ALL")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="RAW">RAW</SelectItem>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="READY">READY</SelectItem>
                <SelectItem value="PUSHED">PUSHED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <Card className="bg-accent">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkSaveDraft}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft (Bulk)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkPush}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Push (Bulk)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredResults.length > 0 && (
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label className="text-sm text-muted-foreground">
                Select all ({filteredResults.length} products)
            </Label>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResults.map((product) => (
              <Card key={product.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                      {hasWarnings(product) && (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <Badge className={getStatusColor(product.lifecycleStatus)}>
                      {product.lifecycleStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(product.imagesFinal?.length ?? 0) > 0 && (
                    <img
                      src={product.imagesFinal?.[0] || ''}
                      alt={getDisplayTitle(product) || 'Product'}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-semibold mb-1">
                    {getDisplayTitle(product) || product.nameOriginal || 'Untitled'}
                  </h3>
                  {product.brand && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {product.brand}
                    </p>
                  )}
                  <p className="text-lg font-bold mb-4">
                    {(product.priceMnt || 0).toLocaleString()} MNT
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/import/new/${product.id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDraft(product.id)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePush(product.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredResults.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No products match your filters</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {currentSearchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Search for products to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

