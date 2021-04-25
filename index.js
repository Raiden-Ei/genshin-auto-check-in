const axios = require('axios');
const cron = require('node-cron');
const moment = require('moment');

// Initial ready message
console.log(`[${getDate()}] Program is ready! please wait until next 0:00 (UTC +8)`);

cron.schedule('*/10 * * * * *', async () => {
  /**
   *  Start automated genshin impact check-in helper
   *  We're gonna use for await ... of loop
   */
  // First, delete config cache to allow editing config without restarting a program.
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  const succeedJobs = [];
  const failedJobs = [];
  // Define nickname object
  const gameNickname = {};

  // Logging for friendly notification
  console.log(`[${getDate()}] Preparing auto check-in for ${config.signCookie.length} users..`);
  for await (const jobCookie of config.signCookie) {
    let userID;
    // Create axios instance
    const instance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
        Cookie: jobCookie,
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=utf-8',
        Referrer: 'https://webstatic-sea.mihoyo.com/',
      },
    });
    // Fetch accountID from Cookie
    const accountID = parseCookie(jobCookie).account_id;
    // Wait for bypass security check
    await waitFor(typeof config.delay === 'number' ? config.delay : 2000);
    // Fetch in-game userID from hoyolab
    const userInfo = await instance.get(`${config.hoyolabURI}?uid=${accountID}`);
    // Issue warning if failed to get userID
    if (userInfo.status !== 200
        || userInfo.data.data?.list?.length < 1) {
      console.log(`[${getDate()}] ERROR! Failed to Fetch userID for accountID ${accountID}`);
      userID = 'Unknown';
      gameNickname[userID] = 'Unknown';
    } else {
      // Define userID
      userID = userInfo.data.data.list[0].game_role_id;
      gameNickname[userID] = userInfo.data.data.list[0].nickname;
    }

    // Wait for bypass security check
    await waitFor(typeof config.delay === 'number' ? config.delay : 2000);
    // Logging with accountID and userID
    console.log(`[${getDate()}] Starting check-in for accountID ${accountID} (userID ${userID})`);
    // If defined cookie is invalid
    if (!isValidCookie(jobCookie)) {
      console.log(`[${getDate()}] ERROR! Invalid cookie format detected for ${accountID} (userID ${userID})!`);
      failedJobs.push(userID);
    } else {
      // Doing check-in job
      const chkInResult = await instance.post(config.signURI, JSON.stringify({ act_id: config.actID }));
      /**
       * If succeed: {"retcode":0,"message":"OK","data":{"code":"ok"}}
       * If failed:{"data":null,"message":"여행자, 이미 출석체크했어~","retcode":-5003}
       */
      if (chkInResult.status !== 200
          || chkInResult.data.retcode !== 0
          || chkInResult.data.data?.code !== 'ok') {
        // Issue warning
        console.log([
          `[${getDate()}] ERROR! Failed to check-in for accountID ${accountID} (userID ${userID})`,
          `[${getDate()}] Reason: ${chkInResult.data?.message ?? 'Unknown'}`,
        ].join('\n'));
        // Push userID to failedJobs array
        failedJobs.push(userID);
      } else {
        console.log(`[${getDate()}] Succeed to check-in for accountID ${accountID} (userID ${userID})!`);
        // Push userID to succeedJobs array
        succeedJobs.push(userID);
      }
    }
  }

  // Result notification
  console.log(`[${getDate()}] Check-in completed! fetching result..`);
  // Fetch both succeed and failed result
  const succeedResult = succeedJobs.length > 0 ? succeedJobs.map((job) => `${job} (${gameNickname[job]})`).join('`, `') : 'None';
  const failedResult = failedJobs.length > 0 ? failedJobs.map((job) => `${job} (${gameNickname[job]})`).join('`, `') : 'None';
  // First, log result to console
  console.log([
    '===================================',
    `[${getDate()}] Succeed: ${succeedResult.replaceAll('`', '')}`,
    `[${getDate()}] Failed: ${failedResult.replaceAll('`', '')}`,
    '===================================',
  ].join('\n'));

  // If webhook URI is defined
  if (config.webhookURI.length >= 1) {
    for await (const webhook of config.webhookURI) {
      // Generate delay due to Discord's API limit
      await waitFor(typeof config.delay === 'number' ? config.delay : '2000');
      const body = JSON.stringify({
        content: [
          `Succeed: \`${succeedResult}\``,
          `Failed: \`${failedResult}\``,
        ].join('\n'),
      });
      const webhookSend = await axios.post(webhook, body, {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
      });
      console.log(`[${getDate()}] Webhook Send for Channel ${webhook.split('/')[5]}: ${webhookSend.status === 204 ? 'Succeed' : 'Failed'}`);
    }
  }

  // Notify for next event
  console.log(`[${getDate()}] Waiting for next job..`);
}, {
  // Enable scheduled option
  scheduled: true,
  // Define china timezone
  timezone: 'Asia/Shanghai',
});

function isValidCookie(cookies) {
  if (typeof cookies !== 'string') return undefined;
  const output = parseCookie(cookies);
  const requiredFields = ['account_id', 'cookie_token'];
  return requiredFields
    .map((field) => Object.keys(output).includes(field))
    .every((element) => !!element);
}

function parseCookie(cookies) {
  const output = {};
  cookies.split(/\s*;\s*/).forEach((pair) => {
    pair = pair.split(/\s*=\s*/);
    output[pair[0]] = pair.splice(1).join('=');
  });
  return output;
}

async function waitFor(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getDate() {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}
