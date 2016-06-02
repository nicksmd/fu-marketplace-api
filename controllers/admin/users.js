'use strict';

var _ = require('lodash');
var models = require('../../models');
var User = models.User;
var Role = models.Role;
var UserUpdateNormalizer = require('../helpers/userUpdateNormalizer');
var sanitizeUpdateRequest = UserUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = UserUpdateNormalizer.getUpdateParams;
var errorHandlers = require('../helpers/errorHandlers');

exports.adminGetAll = (req, res) => {
  User.findAll({
    include: Role
  }).then(users => {
    let result = _.map(users, u => {
      let user = u.toJSON();
      let roleNames = _.map(user.Roles, r => r.name);
      delete user.Roles;
      if (roleNames.length > 0) user['roles'] = roleNames;
      return user;
    });
    res.json({
      users: result
    });
  });
};

exports.adminUpdateUserProfile = (req, res) => {
  var userId = req.params.id;
    
  User.findById(userId).then(user => {
    if (!user){
      res.status(404);
      res.json({
        status: 404,
        error: 'User is not exits'
      });
    } else{
      sanitizeUpdateRequest(req, true);
      user.update(getUpdateParams(req, true)).then(user => {
        let result = user.toJSON();
        user.getRoles().then(roles => {
          let roleNames = _.map(roles, r => r.name);
          if (roleNames.length > 0) result['roles'] = roleNames;
          res.json(result);
        });
      }).catch(err => {
        errorHandlers.modelErrorHandler(err, res);
      });
    }
  });
};

exports.adminGetUser = (req, res) => {
  var userId = req.params.id;
  
  User.findById(userId).then(user => {
    if (!user){
      res.status(404);
      res.json({
        status: 404,
        error: 'User is not exits'
      });
    } else{
      let result = user.toJSON();
      user.getRoles().then(roles => {
        let roleNames = _.map(roles, r => r.name);
        if (roleNames.length > 0) result['roles'] = roleNames;
        res.json(result);
      });
    }
  });
};