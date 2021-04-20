# Genshin Auto Check-In Helper
An awesome project for developers. Written in Javascript

**DISCLAIMER: I'm not responsible for any problems caused by using this program.**

# How to Use
1. Visit [Daily check-in page](https://webstatic-sea.mihoyo.com/ys/event/signin-sea/index.html?act_id=e202102251931481)
1. Log-in to the website
1. Open browser console (Ctrl + Shift + I and find 'Console' tab)
1. Execute `console.log(document.cookie)`
1. Copy the result (must be like `"login_ticket=xxx; account_id=xxx; cookie_token=xxx; ltoken=xxx; ltuid=xxx; mi18nLang=xxx; _MHYUUID=xxx"`)
1. Rename the config file from `config.example.js` to `config.js`
1. Fill `signCookie` array with copied result (DO NOT MODIFY ANY OTHER SETTINGS UNLESS YOU DO UNDERSTAND EXACTLY WHAT YOU ARE DOING)
1. Run `npm install` and `node index.js`
1. Wait until 0:00 AM (UTC +8)

# Want to add more accounts?
1. Open new browser
1. Repeat 1-5 in the 1st section with another account
1. Change `signCookie` key in the config file like an example
1. Literally done! restarting isn't required.

```js
// Example
signCookie: [
  // 1st account
  "login_ticket=xxx; account_id=xxx; cookie_token=xxx; ltoken=xxx; ltuid=xxx; mi18nLang=xxx; _MHYUUID=xxx",
  // 2nd account
  "login_ticket=yyy; account_id=yyy; cookie_token=yyy; ltoken=yyy; ltuid=yyy; mi18nLang=yyy; _MHYUUID=yyy",
  // add more accounts if you want..
]
```

# Discord webhook integration
1. Create a webhook
1. Edit `webhookURI` key.

# License
This program is licensed under GNU Affero General Public License v3.

# Contributing
Please open [Issue](https://github.com/SkyFlags/genshin-auto-check-in/issues) or [Pull Requests](https://github.com/SkyFlags/genshin-auto-check-in/pulls) if you want to contribute to this project.

p.s. My english skill is too bad, so please understand even if you found any wrong grammars on this README ;)