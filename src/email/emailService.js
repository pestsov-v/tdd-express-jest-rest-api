const transporter = require('../config/emailTransporter');

const sendAccountActivation = async (email, token) => {
  await transporter.sendMail({
    from: 'My app <myapp@mail.com>',
    to: email,
    subject: 'Account activation',
    html: `Token is ${token}`,
  });
};

module.exports = { sendAccountActivation };
