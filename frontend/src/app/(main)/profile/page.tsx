"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";
import { User, Phone, MapPin, Camera, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenealogyForm } from "@/components/genealogy-form";

export default function ProfilePage() {
  const {
    user,
    profile,
    refreshProfile,
    isLoggedIn,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setPhoneNumber(profile.phone_number || "");
      setAddress(profile.address || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          phone_number: phoneNumber,
          address: address,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Update profile error:", error);
        toast.error("Lỗi cập nhật: " + error.message);
      } else {
        toast.success("Đã cập nhật hồ sơ thành công!");
        await refreshProfile();
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi không xác định khi lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUploadSuccess = async (result: any) => {
    const info = result.info;
    const newAvatarUrl = info.secure_url;

    setAvatarUrl(newAvatarUrl);

    // Auto save avatar directly
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (!error) {
        toast.success("Đã cập nhật ảnh đại diện mới.");
        await refreshProfile();
      }
    }
  };

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8 text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">
          Hồ sơ cá nhân
        </h1>
        <p className="text-muted-foreground text-sm flex items-center justify-center md:justify-start gap-1.5">
          Quản lý thông tin liên hệ và ảnh đại diện của bạn.
        </p>
      </div>

      <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-[1fr_2fr] lg:grid-cols-[2fr_2.5fr]">
        {/* Avatar Sidebar */}
        <Card className="border shadow-sm bg-white overflow-hidden h-fit relative">
          <div className="bg-linear-to-br from-primary/30 via-primary/10 to-transparent h-28 sm:h-32 w-full absolute top-0 left-0" />
          <CardHeader className="text-center pt-8 sm:pt-12 pb-6 relative z-10">
            <div className="mx-auto w-28 h-28 sm:w-32 sm:h-32 relative mb-5">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-background shadow-lg flex items-center justify-center bg-primary/5 relative group transition-all duration-300 hover:shadow-primary/20 hover:shadow-xl">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-primary/50" />
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full pointer-events-none">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>

              <CldUploadWidget
                signatureEndpoint="/api/cloudinary/sign"
                onSuccess={handleUploadSuccess}
                options={{
                  maxFiles: 1,
                  resourceType: "image",
                  clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
                  maxFileSize: 5242880, // 5MB
                  folder: "avatars",
                }}
              >
                {({ open }) => (
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full w-10 h-10 shadow-lg border-2 border-white ring-0"
                    onClick={(e) => {
                      e.preventDefault();
                      open();
                    }}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                )}
              </CldUploadWidget>
            </div>
            <CardTitle>
              {profile?.display_name || "Thành viên gia tộc"}
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                {profile?.role === "admin" ? "Quản trị viên" : "Thành viên"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings Form */}
        <div className="flex flex-col gap-6 w-full">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="account">Tài khoản</TabsTrigger>
              <TabsTrigger value="genealogy">Gia phả</TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Thông tin liên lạc</CardTitle>
                  <CardDescription className="text-sm">
                    Cập nhật tên, số điện thoại và địa chỉ nơi ở hiện tại.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Họ và tên</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="displayName"
                          placeholder="VD: Nguyễn Văn A"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Số điện thoại</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phoneNumber"
                          placeholder="VD: 0987654321"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Địa chỉ nơi thường trú</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="VD: Quận 1, Tp.Hồ Chí Minh"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setDisplayName(profile?.display_name || "");
                          setPhoneNumber(profile?.phone_number || "");
                          setAddress(profile?.address || "");
                        }}
                      >
                        Hủy thay đổi
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto shadow-sm"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                            Đang lưu...
                          </>
                        ) : (
                          "Lưu thay đổi"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="genealogy">
              {profile?.person_handle ? (
                <GenealogyForm personHandle={profile.person_handle} />
              ) : (
                <Card className="border shadow-sm">
                  <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      Chưa liên kết phả hệ
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Tài khoản của bạn chưa được liên kết với một thành viên
                      trong cây gia phả. Vui lòng liên hệ Quản trị viên để được
                      cấp quyền tự chỉnh sửa thông tin.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
