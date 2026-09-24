const Reservation = require("../models/Reservation");
const reservations = require("../services/reservationService");
const { reservationDto, noticeDto } = require("../dto");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    const docs = await Reservation.find(reservations.listFilter(req, req.query)).sort({ updatedAt: -1 }).limit(1000).lean();
    res.json(docs.map(reservationDto));
  },
  async upsert(req, res) {
    res.status(201).json(reservationDto(await reservations.upsertReservation(req, req.body)));
  },
  async remove(req, res) {
    await reservations.removeReservation(req, req.params.id);
    res.json({ message: "Reservation released." });
  },
  async clearForCustomer(req, res) {
    await reservations.clearForCustomer(req, req.params.customerId);
    res.json({ message: "Draft reservations released." });
  },
  async transfer(req, res) {
    res.json(reservationDto(await reservations.transferReservation(req, req.params.id, req.body)));
  },
  async notices(req, res) {
    res.json((await reservations.listNotices(req)).map(noticeDto));
  },
  async ackNotice(req, res) {
    await reservations.ackNotice(req, req.params.id);
    res.json({ message: "Acknowledged." });
  },
});
