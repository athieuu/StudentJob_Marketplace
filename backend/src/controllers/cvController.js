
const cvModel = require("../models/cvModel");

const validId = value =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0;

function validateCV(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Dữ liệu CV không hợp lệ";
  }
  if (typeof data.title !== "string" ||
      !data.title.trim() ||
      data.title.length > 255) {
    return "Tên CV phải có từ 1 đến 255 ký tự";
  }
  if (data.template !== undefined &&
      (typeof data.template !== "string" ||
       data.template.length > 50)) {
    return "Mẫu CV không hợp lệ";
  }
  return null;
}

const create = async (req, res) => {
  try {
    const error = validateCV(req.body);
    if (error) return res.status(400).json({ message: error });

    const id = await cvModel.createCV(req.user.id, req.body);
    res.status(201).json({
      message: "Tạo CV thành công",
      data: { id }
    });
  } catch (error) {
    console.error("Create CV error:", error);
    res.status(500).json({ message: "Không thể tạo CV" });
  }
};

const getMine = async (req, res) => {
  try {
    const data = await cvModel.getMyCVs(req.user.id);
    res.json({ data });
  } catch (error) {
    console.error("Get CVs error:", error);
    res.status(500).json({ message: "Không thể lấy danh sách CV" });
  }
};

const getById = async (req, res) => {
  try {
    if (!validId(req.params.id))
      return res.status(400).json({ message: "ID không hợp lệ" });

    const data = await cvModel.getCVById(
      Number(req.params.id), req.user.id
    );

    if (!data)
      return res.status(404).json({ message: "Không tìm thấy CV" });

    res.json({ data });
  } catch (error) {
    console.error("Get CV error:", error);
    res.status(500).json({ message: "Không thể lấy CV" });
  }
};

const update = async (req, res) => {
  try {
    if (!validId(req.params.id))
      return res.status(400).json({ message: "ID không hợp lệ" });

    const error = validateCV(req.body);
    if (error) return res.status(400).json({ message: error });

    const affected = await cvModel.updateCV(
      Number(req.params.id), req.user.id, req.body
    );

    if (!affected)
      return res.status(404).json({ message: "Không tìm thấy CV" });

    res.json({ message: "Cập nhật CV thành công" });
  } catch (error) {
    console.error("Update CV error:", error);
    res.status(500).json({ message: "Không thể cập nhật CV" });
  }
};

const remove = async (req, res) => {
  try {
    if (!validId(req.params.id))
      return res.status(400).json({ message: "ID không hợp lệ" });

    const affected = await cvModel.deleteCV(
      Number(req.params.id), req.user.id
    );

    if (!affected)
      return res.status(404).json({ message: "Không tìm thấy CV" });

    res.json({ message: "Xóa CV thành công" });
  } catch (error) {
    console.error("Delete CV error:", error);
    res.status(500).json({ message: "Không thể xóa CV" });
  }
};

module.exports = { create, getMine, getById, update, remove };
