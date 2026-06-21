const { createContactResponse } = require("../../server/contact-handler");

exports.handler = async (event) =>
  createContactResponse({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });
