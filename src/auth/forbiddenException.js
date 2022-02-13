module.exports = function forbiddenException() {
  this.status = 403;
  this.message = 'inactive_authentification_failure';
};
