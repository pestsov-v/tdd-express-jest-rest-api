module.exports = function invalidTokenException() {
  this.message = 'account_activation_failure';
  this.status = 400;
};
