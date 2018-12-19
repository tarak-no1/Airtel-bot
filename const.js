'use strict';

// Wit.ai parameters
//const WIT_TOKEN = process.env.WIT_TOKEN;
const WIT_TOKEN = "CZJTZENICTHGLO7R5UBOHFAKY2AKVWFI";
if (!WIT_TOKEN) {
  throw new Error('missing WIT_TOKEN');
}

// Messenger API parameters
//const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_PAGE_TOKEN = "EAAboctkPGnUBAHfYC63yZA0pGoaobqvsMDknAkVo9CRf7GioWNXZAD5KFTlRj3Qt6HkpBn5o2kfeLO5MZCENlM9Y0QeljomTNRStLTxvcQrfCAY5HeL1Qxmrnpx5kMbSluisR85TalgfZB4XdkyPYvFS9bpHBU67KaZCgcGtgIxPhTVgcWc2a";
var FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
if (!FB_VERIFY_TOKEN) {
  FB_VERIFY_TOKEN = "just_do_it";
}

module.exports = {
  WIT_TOKEN: WIT_TOKEN,
  FB_PAGE_TOKEN: FB_PAGE_TOKEN,
  FB_VERIFY_TOKEN: FB_VERIFY_TOKEN,
};