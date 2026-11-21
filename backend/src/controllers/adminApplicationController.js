
const {
    getAllApplications
} = require("../models/adminApplicationModel");

const listAllApplications = async (req, res) => {
    try {
        const applications = await getAllApplications();

        const statistics = {
            total: applications.length,
            pending: applications.filter(
                a => a.status === "PENDING"
            ).length,
            accepted: applications.filter(
                a => a.status === "ACCEPTED"
            ).length,
            rejected: applications.filter(
                a => a.status === "REJECTED"
            ).length
        };

        return res.status(200).json({
            message: "Lấy toàn bộ đơn ứng tuyển thành công",
            statistics,
            data: applications
        });

    } catch (error) {
        console.error(
            "Admin get applications error:",
            error
        );

        return res.status(500).json({
            message: "Không thể lấy danh sách đơn ứng tuyển"
        });
    }
};

module.exports = {
    listAllApplications
};
