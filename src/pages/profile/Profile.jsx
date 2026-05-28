import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MdBadge,
  MdEmail,
  MdLock,
  MdPhotoCamera,
  MdSave,
  MdWork,
} from "react-icons/md";
import AppShell from "../../components/common/AppShell";
import { useAuth } from "../../context/AuthContext";
import { authAPI, profileAPI } from "../../services/api";
import "./profile.css";

export default function Profile() {
  const { isAdmin, profile, refreshProfile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    department: "",
    position: "",
    password: "",
    confirmPassword: "",
  });

  const displayName =
    profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Operator";
  const avatarUrl = profile?.avatar_url;
  const avatarPreviewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile]
  );

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || profile?.name || "",
      email: user?.email || "",
      department: profile?.department || profile?.departments?.name || "",
      position: profile?.position || "",
      password: "",
      confirmPassword: "",
    });
  }, [profile, user?.email]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      if (form.password || form.confirmPassword) {
        if (form.password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
      }

      if (avatarFile) {
        await profileAPI.uploadAvatar(avatarFile, user.id);
      }

      await profileAPI.updateProfile(user.id, {
        full_name: form.full_name,
        department: form.department,
        position: form.position,
      });

      if (form.email && form.email !== user.email) {
        await authAPI.updateEmail(form.email);
      }

      if (form.password) {
        await authAPI.updatePassword(form.password);
      }

      await refreshProfile(user);
      setAvatarFile(null);
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      toast.success(
        form.email && form.email !== user.email
          ? "Profile updated. Check your inbox to confirm the new email."
          : "Profile updated."
      );
    } catch (error) {
      toast.error(error?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="page page-stack profile-page">
        <header className="page-header profile-hero">
          <div>
            <span className="eyebrow">Account Settings</span>
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">
              Update your account details and profile photo.
            </p>
          </div>
          <span className="pill">{isAdmin ? "Administrator" : "Employee"}</span>
        </header>

        <section className="profile-layout">
          <aside className="profile-summary glass-card">
            <div className="profile-photo">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="New profile preview" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <strong>{displayName}</strong>
            <span>{user?.email}</span>
            <p>{form.position || form.department || "No profile details yet"}</p>
          </aside>

          <form className="profile-form table-card" onSubmit={saveProfile}>
            <label className="profile-upload">
              <MdPhotoCamera />
              <span>{avatarFile ? avatarFile.name : "Upload profile photo"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                disabled={saving}
              />
            </label>

            <div className="form-two">
              <label className="field-control">
                <span><MdBadge /> Full name</span>
                <input value={form.full_name} onChange={set("full_name")} disabled={saving} />
              </label>

              <label className="field-control">
                <span><MdEmail /> Email</span>
                <input type="email" value={form.email} onChange={set("email")} disabled={saving} />
              </label>
            </div>

            <div className="form-two">
              <label className="field-control">
                <span><MdWork /> Department</span>
                <input value={form.department} onChange={set("department")} disabled={saving} />
              </label>

              <label className="field-control">
                <span><MdWork /> Position</span>
                <input value={form.position} onChange={set("position")} disabled={saving} />
              </label>
            </div>

            <div className="profile-section-title">Password</div>

            <div className="form-two">
              <label className="field-control">
                <span><MdLock /> New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Minimum 8 characters"
                  disabled={saving}
                />
              </label>

              <label className="field-control">
                <span><MdLock /> Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Repeat password"
                  disabled={saving}
                />
              </label>
            </div>

            <button className="primary-btn profile-submit" type="submit" disabled={saving}>
              <MdSave />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
