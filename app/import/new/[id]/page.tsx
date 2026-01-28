"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useProductStore } from "@/lib/store"
import { ProductStatus } from "@/types/product"
import { normalizeProduct } from "@/lib/normalizeProduct"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Save, CheckCircle, Send, X, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function ProductEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const productId = params.id as string

  const {
    products,
    currentSearchResults,
    getProduct,
    updateProduct,
    updateProductStatus,
    validateProduct,
  } = useProductStore()

  // ALL HOOKS MUST BE BEFORE ANY EARLY RETURNS
  const [formData, setFormData] = useState({
    nameMn: "",
    descriptionMn: "",
    brand: "",
    priceMnt: 0,
    imagesFinal: [] as string[],
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState("")

  // Get product and compute navigation context
  const rawProduct = getProduct(productId)
  // Normalize product to ensure all required fields are populated from existing fields
  // This handles cases where product has title/detailed_description but not nameMn/descriptionMn
  const product = rawProduct ? normalizeProduct(rawProduct) : null
  // Fallback: use all products if not in currentSearchResults
  const navigationList = currentSearchResults.length > 0 ? currentSearchResults : products
  const currentIndex = navigationList.findIndex((p) => p.id === productId)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < navigationList.length - 1

  // Update form data when product changes
  // Product is normalized to auto-fill Final fields from existing MongoDB fields
  useEffect(() => {
    if (product) {
      setFormData({
        // Auto-fill from title if nameMn is empty (normalized)
        nameMn: product.nameMn || "",
        // Auto-fill from detailed_description or short_description if descriptionMn is empty (normalized)
        descriptionMn: product.descriptionMn || "",
        brand: product.brand || "",
        // Use normalized priceMnt (calculated from sale_price/regular_price if needed)
        priceMnt: product.priceMnt || 0,
        // Use normalized imagesFinal (extracted from custom_properties.imageUrls if needed)
        imagesFinal: [...(product.imagesFinal || [])],
      })
      setHasUnsavedChanges(false)
    }
  }, [product])

  // Handler functions - defined before useCallback
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const handleSave = useCallback(() => {
    if (!product) return
    updateProduct(productId, formData)
    setHasUnsavedChanges(false)
    toast({
      title: "Draft Saved",
      description: "Changes have been saved",
    })
  }, [productId, formData, updateProduct, toast, product])

  const handleNavigate = useCallback((targetId: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(targetId)
      setShowConfirmDialog(true)
    } else {
      router.push(`/import/new/${targetId}`)
    }
  }, [hasUnsavedChanges, router])

  // Keyboard shortcuts
  useEffect(() => {
    if (!product) return // Early exit in effect, not component

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault()
          handleSave()
        }
      } else {
        if (e.key === "j" && hasNext) {
          e.preventDefault()
          const nextId = navigationList[currentIndex + 1]?.id
          if (nextId) handleNavigate(nextId)
        } else if (e.key === "k" && hasPrevious) {
          e.preventDefault()
          const prevId = navigationList[currentIndex - 1]?.id
          if (prevId) handleNavigate(prevId)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasNext, hasPrevious, currentIndex, navigationList, handleSave, handleNavigate, product])

  // NOW safe to do early return
  if (!product) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Product not found</p>
            <Link href="/import/new">
              <Button className="mt-4" variant="outline">
                Back to Search
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleImageAdd = () => {
    setShowImageDialog(true)
  }

  const handleImageAddConfirm = () => {
    if (newImageUrl.trim()) {
      handleFieldChange("imagesFinal", [...formData.imagesFinal, newImageUrl.trim()])
      setNewImageUrl("")
      setShowImageDialog(false)
    }
  }

  const handleImageRemove = (index: number) => {
    handleFieldChange(
      "imagesFinal",
      formData.imagesFinal.filter((_, i) => i !== index)
    )
  }

  const handleImageReorder = (index: number, direction: "up" | "down") => {
    const newImages = [...formData.imagesFinal]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newImages.length) return

    ;[newImages[index], newImages[targetIndex]] = [
      newImages[targetIndex],
      newImages[index],
    ]
    handleFieldChange("imagesFinal", newImages)
  }

  const handleMarkReady = () => {
    const updatedProduct = { ...product, ...formData }
    const validation = validateProduct(updatedProduct)
    if (!validation.isValid) {
      toast({
        title: "Validation Failed",
        description: validation.errors.map((e) => e.message).join(", "),
        variant: "destructive",
      })
      return
    }

    updateProduct(productId, formData)
    updateProductStatus(productId, "READY")
    setHasUnsavedChanges(false)
    toast({
      title: "Marked as Ready",
      description: "Product is ready to push",
    })
  }

  const handlePush = () => {
    const updatedProduct = { ...product, ...formData }
    const validation = validateProduct(updatedProduct)
    if (!validation.isValid) {
      toast({
        title: "Validation Failed",
        description: validation.errors.map((e) => e.message).join(", "),
        variant: "destructive",
      })
      return
    }

    updateProduct(productId, formData)
    updateProductStatus(productId, "PUSHED")
    setHasUnsavedChanges(false)
    toast({
      title: "Pushed",
      description: "Product has been pushed",
    })
  }

  const handleConfirmNavigation = (action: "discard" | "save" | "cancel") => {
    if (action === "save") {
      handleSave()
    }
    if (action !== "cancel" && pendingNavigation) {
      router.push(`/import/new/${pendingNavigation}`)
    }
    setShowConfirmDialog(false)
    setPendingNavigation(null)
  }

  const validation = validateProduct({ ...product, ...formData })
  const getFieldError = (field: string) => {
    return validation.errors.find((e) => e.field === field)?.message
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/import/new">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Product</h1>
            <p className="text-muted-foreground mt-1">
              {currentIndex >= 0 ? (
                <>Product {currentIndex + 1} of {navigationList.length}</>
              ) : (
                <>Product not in current search results</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={!hasPrevious}
            onClick={() => {
              if (hasPrevious && currentIndex > 0) {
                const prevId = navigationList[currentIndex - 1]?.id
                if (prevId) handleNavigate(prevId)
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!hasNext}
            onClick={() => {
              if (hasNext && currentIndex < navigationList.length - 1) {
                const nextId = navigationList[currentIndex + 1]?.id
                if (nextId) handleNavigate(nextId)
              }
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {validation.errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-sm text-destructive">
                  {error.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Final (Editable) Column */}
        <Card>
          <CardHeader>
            <CardTitle>Final (Editable)</CardTitle>
            <CardDescription>Edit these fields for the final product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nameMn">
                Name (Mongolian) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nameMn"
                value={formData.nameMn}
                onChange={(e) => handleFieldChange("nameMn", e.target.value)}
                className={getFieldError("nameMn") ? "border-destructive" : ""}
              />
              {getFieldError("nameMn") && (
                <p className="text-sm text-destructive">{getFieldError("nameMn")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriptionMn">
                Description (Mongolian) <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="descriptionMn"
                value={formData.descriptionMn}
                onChange={(e) => handleFieldChange("descriptionMn", e.target.value)}
                className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  getFieldError("descriptionMn") ? "border-destructive" : ""
                }`}
              />
              {getFieldError("descriptionMn") && (
                <p className="text-sm text-destructive">
                  {getFieldError("descriptionMn")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleFieldChange("brand", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMnt">
                Price (MNT) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="priceMnt"
                type="number"
                value={formData.priceMnt}
                onChange={(e) =>
                  handleFieldChange("priceMnt", Number(e.target.value))
                }
                className={getFieldError("priceMnt") ? "border-destructive" : ""}
              />
              {getFieldError("priceMnt") && (
                <p className="text-sm text-destructive">{getFieldError("priceMnt")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Images <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                {formData.imagesFinal.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <Input value={url} readOnly className="text-xs" />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleImageReorder(index, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleImageReorder(index, "down")}
                        disabled={index === formData.imagesFinal.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleImageRemove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={handleImageAdd}>
                  + Add Image
                </Button>
              </div>
              {getFieldError("imagesFinal") && (
                <p className="text-sm text-destructive">
                  {getFieldError("imagesFinal")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Original (Read-only) Column */}
        <Card>
          <CardHeader>
            <CardTitle>Original (Read-only)</CardTitle>
            <CardDescription>Reference information from source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store</Label>
              <Input value={product.sourceStore} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={product.category} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Source URL</Label>
              <Input value={product.sourceUrl} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Name (Original)</Label>
              <Input value={product.nameOriginal} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Description (Original)</Label>
              <textarea
                value={product.descriptionOriginal}
                readOnly
                className="flex min-h-[80px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Price (KRW)</Label>
              <Input
                value={(product.priceKrw || 0).toLocaleString()}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label>Original Images</Label>
              <div className="grid grid-cols-2 gap-2">
                {(product.imagesOriginal || []).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Original ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 bg-background border-t p-4 rounded-t-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={
                product.lifecycleStatus === "RAW"
                  ? "bg-gray-100 text-gray-800"
                  : product.lifecycleStatus === "DRAFT"
                  ? "bg-blue-100 text-blue-800"
                  : product.lifecycleStatus === "READY"
                  ? "bg-green-100 text-green-800"
                  : "bg-purple-100 text-purple-800"
              }
            >
              {product.lifecycleStatus}
            </Badge>
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkReady}
              disabled={!validation.isValid}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Ready
            </Button>
            <Button onClick={handlePush} disabled={!validation.isValid}>
              <Send className="mr-2 h-4 w-4" />
              Push
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleConfirmNavigation("discard")}
            >
              Discard
            </Button>
            <Button
              variant="outline"
              onClick={() => handleConfirmNavigation("save")}
            >
              Save Draft
            </Button>
            <Button onClick={() => handleConfirmNavigation("cancel")}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image URL</DialogTitle>
            <DialogDescription>
              Enter the URL for the new image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="https://example.com/image.jpg"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleImageAddConfirm()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewImageUrl("")
                setShowImageDialog(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImageAddConfirm} disabled={!newImageUrl.trim()}>
              Add Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

