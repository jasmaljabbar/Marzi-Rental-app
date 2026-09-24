const settings = require("../services/settingService");
const { createUrlResolver } = require("../storage");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    const files = createUrlResolver(req);
    res.json((await settings.listSettings(req)).map((s) => settings.toDto(s, files)));
  },
  async get(req, res) {
    res.json(settings.toDto(await settings.getSetting(req, req.params.key), createUrlResolver(req)));
  },
  async update(req, res) {
    res.json(settings.toDto(await settings.updateSetting(req, req.params.key, req.body.value), createUrlResolver(req)));
  },
});
