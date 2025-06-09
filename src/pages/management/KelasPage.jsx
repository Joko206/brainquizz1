import React from "react";
import DataTable from "../../components/DataTable";
import { api } from "../../services/api";
import { BASE_URL } from "../../constants/api";

const DaftarKelas = () => {
  const fields = [
    { name: "name", label: "Nama Kelas" },
    { name: "description", label: "Deskripsi", type: "textarea" },
  ];

  // Fungsi untuk mentransformasi data
  const transformData = (data) => {
    console.log(
      "Data sebelum transformasi (raw):",
      JSON.stringify(data, null, 2)
    );
    console.log("Tipe data:", typeof data);
    console.log("Apakah array:", Array.isArray(data));

    if (!data) {
      console.error("Data kosong");
      return [];
    }

    if (!Array.isArray(data)) {
      console.error("Data bukan array:", data);
      return [];
    }

    const transformed = data
      .filter((item) => {
        console.log("Checking item:", JSON.stringify(item, null, 2));
        return item && (item.Name || item.name);
      })
      .map((item) => {
        console.log("Mapping item:", item);
        return {
          id: item.ID || item.id,
          name: item.Name || item.name || "",
          description: item.Description || item.description || "",
        };
      });

    console.log("Data setelah transformasi:", transformed);
    return transformed;
  };

  const handleAdd = async (data) => {
    try {
      console.log("Data yang akan ditambahkan:", data);
      const response = await api.addKelas(data);
      console.log("Response dari server:", response);

      if (!response.success) {
        throw new Error(response.message || "Gagal menambahkan kelas");
      }
      alert("Kelas berhasil ditambahkan");
    } catch (error) {
      console.error("Error saat menambahkan kelas:", error);
      throw error;
    }
  };

  const handleEdit = async (id, data) => {
    try {
      const itemId = id || data?.id || data?.ID;
      if (!itemId) {
        throw new Error("ID kelas tidak ditemukan");
      }

      console.log("ID yang akan diupdate:", itemId);
      console.log("Data yang akan diupdate:", data);
      const response = await api.updateKelas(itemId, {
        name: data.name,
        description: data.description,
      });
      console.log("Response dari server:", response);

      if (!response.success) {
        throw new Error(response.message || "Gagal mengupdate kelas");
      }
      return response;
    } catch (error) {
      console.error("Error saat mengupdate kelas:", error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    try {
      const itemId = typeof id === 'object' ? (id?.id || id?.ID) : id;
      if (!itemId) {
        throw new Error("ID kelas tidak ditemukan");
      }

      console.log("ID yang akan dihapus:", itemId);
      const response = await api.deleteKelas(itemId);
      console.log("Response dari server:", response);

      if (!response.success) {
        throw new Error(response.message || "Gagal menghapus kelas");
      }
      return response;
    } catch (error) {
      console.error("Error saat menghapus kelas:", error);
      throw error;
    }
  };

  return (
    <DataTable
      title="Daftar Kelas"
      endpoint={`${BASE_URL}/kelas/get-kelas`}
      fields={fields}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      transformData={transformData}
    />
  );
};

export default DaftarKelas;
