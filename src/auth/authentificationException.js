module.exports = function AuthentificationException() {
  this.status = 401;
  this.message = 'authentification_failure';
};
