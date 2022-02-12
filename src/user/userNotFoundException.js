module.exports = function userNotFoundException() {
  this.status = 404;
  this.message = 'user_not_found';
};
