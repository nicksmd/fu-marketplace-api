'use strict';

var _ = require('lodash');
var errorHandlers = require('../helpers/errorHandlers');
var models = require('../../models');
var Order = models.Order;
var Shop = models.Shop;
var User = models.User;
var Ticket = models.Ticket;
var OrderLine = models.OrderLine;

const DEFAULT_PAGE_SIZE = 10;

exports.getTickets = (req, res) => {
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);
  let status = req.query.status;

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;

  let ticketFindOption = {
    include: {
      model: Order,
      include: [{
        model: User,
        attributes: ['id', 'fullName']
      }, {
        model: Shop,
        attributes: ['id', 'name']
      }]
    },
    limit: perPage,
    offset: offset,
    order: [
      ['status'],
      ['updatedAt', 'DESC']
    ]
  };

  if (status){
    if (!_.isNumber(Ticket.STATUS[status])) {
      let error = 'Invalid status query';
      errorHandlers.responseError(404, error, 'query', res);
      return;
    } else {
      ticketFindOption.where = {
        status: Ticket.STATUS[status]
      };
    }
  }

  Ticket.findAll(ticketFindOption).then(tickets => {
    let result = _.map(tickets, o => {
      let ticket = o.toJSON();

      ticket['shop'] = ticket.Order.Shop.get();
      delete ticket.Shop;

      ticket['user'] = ticket.Order.User.get();
      delete ticket.Order;

      return ticket;
    });
    res.json({
      tickets: result
    });
  }).catch(err => {
    errorHandlers.handleModelError(err, res);
  });
};

exports.getTicket = (req, res) => {
  let ticketId = req.params.ticketId;

  Ticket.findOne({
    where: {
      id: ticketId
    },
    include: {
      model: Order,
      include: {
        model: OrderLine,
        attributes: ['item', 'note', 'quantity']
      }
    }
  }).then(t => {
    if (!t) {
      let error = 'Ticket does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return Promise.resolve(t);
    }
  }).then(t => {
    let result = t.toJSON();

    result.order = _.pick(t.Order, ['userId', 'shopId', 'note', 'status', 'shipAddress', 'sellerMessage', 'createdAt', 'updatedAt']);
    result.order['orderLines'] = _.map(t.Order.OrderLines, ol => ol.get());
    delete result.Order;

    res.json(result);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

exports.postInvestigateTicket = (req, res) => {
  let ticketId = req.params.ticketId;

  Ticket.findOne({
    where: {
      id: ticketId
    },
    include: [
      Order
    ]
  }).then(t => {
    if (!t) {
      let error = 'Ticket does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return t.investigateTicket();
    }
  }).then(t => {
    let result = t.toJSON();
    result.order = result.Order;
    delete result.Order;
    res.json(result);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

exports.postCloseTicket = (req, res) => {
  let ticketId = req.params.ticketId;

  let closeTicketInfo = _.pick(req.body, ['adminComment']);
  if (!closeTicketInfo.adminComment) {
    let error = 'Admin must provide comment when close ticket';
    errorHandlers.responseError(400, error, 'validation', res);
  } else {
    Ticket.findOne({
      where: {
        id: ticketId
      },
      include: [
        Order
      ]
    }).then(t => {
      if (!t) {
        let error = 'Ticket does not exist';
        return Promise.reject({status: 404, message: error, type: 'model'});
      } else {
        return t.closeTicketByAdmin(closeTicketInfo);
      }
    }).then(t => {
      let result = t.toJSON();
      result.order = result.Order;
      delete result.Order;
      res.json(result);
    }).catch((err) => {
      if (err.status) {
        errorHandlers.responseError(err.status, err.message, err.type, res);
      } else {
        errorHandlers.handleModelError(err, res);
      }
    });
  }
};
