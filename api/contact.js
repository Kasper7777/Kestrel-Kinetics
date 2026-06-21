const { createContactResponse } = require("../server/contact-handler");

module.exports = async function contact(req, res) {
  const response = await createContactResponse({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  Object.entries(response.headers || {}).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.status(response.statusCode).send(response.body);
};
