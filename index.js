const fetch = require('node-fetch');
const cron = require('node-cron');
const moment = require('moment');

// Initial ready message
console.log(`[${getDate()}] Program is ready! please wait until next 0:00 (UTC +8)`);

cron.schedule('0 0 * * *', async () => {
  /**
   *  Start automated genshin impact check-in helper
   *  We're gonna use for await ... of loop
   */
  // First, delete config cache to allow editing config without restarting a program.
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  const succeedJobs = [];
  const failedJobs = [];

  // Logging for friendly notification
  console.log(`[${getDate()}] Preparing auto check-in for ${config.signCookie.length} users..`);
  for await (const jobCookie of config.signCookie) {
    // Fetch accountID from Cookie
    const accountID = parseCookie(jobCookie).account_id;
    // Wait for bypass security check
    await waitFor(typeof config.delay === 'number' ? config.delay : 2000);
    // Fetch in-game userID from hoyolab
    let userID = await fetch(`${config.hoyolabURI}?uid=${accountID}`, {
      headers: {
        // Assign default user agent (Chrome 90 running on Windows 10)
        'User-Agent': config.userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=utf-8',
        Cookie: jobCookie,
      },
      // Referrer for bypass security check
      referrer: 'https://webstatic-sea.mihoyo.com/',
      method: 'GET',
    });
    // Issue warning if failed to get userID
    if (!userID.ok
        || userID.data?.list?.length < 1) {
      console.log(`[${getDate()}] ERROR! Failed to Fetch userID for accountID ${accountID}`);
      userID = 'Unknown';
    } else {
      // Define userID
      userID = await userID.json();
      userID = userID.data.list[0].game_role_id;
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
      const chkInResult = await fetch(config.signURI, {
        credentials: 'include',
        headers: {
          // Assign default user agent (Chrome 90 running on Windows 10)
          'User-Agent': config.userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json;charset=utf-8',
          Cookie: jobCookie,
        },
        // Referrer for bypass security check
        referrer: 'https://webstatic-sea.mihoyo.com/',
        body: JSON.stringify({ act_id: config.actID }),
        method: 'POST',
      });
      const bodyResult = await chkInResult.json();
      /**
       * If succeed: {"retcode":0,"message":"OK","data":{"code":"ok"}}
       * If failed:{"data":null,"message":"여행자, 이미 출석체크했어~","retcode":-5003}
       */
      if (!chkInResult.ok
          || bodyResult.retcode !== 0
          || bodyResult.data?.code !== 'ok') {
        // Issue warning
        console.log([
          `[${getDate()}] ERROR! Failed to check-in for accountID ${accountID} (userID ${userID})`,
          `Reason: ${bodyResult?.message ?? 'Unknown'}`,
        ].join('\n'));
        // Push userID to failedJobs array
        failedJobs.push(userID);
      } else {
        console.log(`${getDate()} Succeed to check-in for accountID ${accountID} (userID ${userID})!`);
        // Push userID to succeedJobs array
        succeedJobs.push(userID);
      }
    }
  }

  // Notify the count of succeed and failed jobs
  const result = [
    `Succeed: \`${succeedJobs.length >= 1 ? succeedJobs.join('`, `') : 'None'}\``,
    `Failed: \`${failedJobs.length >= 1 ? failedJobs.join('`, `') : 'None'}\``,
  ].join('\n');
  // First, log result to console
  console.log(`[${getDate()}] ${result.replaceAll('\`', '')}`);

  // If webhook URI is defined
  if (config.webhookURI.length >= 1) {
    for await (const webhook of config.webhookURI) {
      // Generate delay due to Discord's API limit
      await waitFor(typeof config.delay === 'number' ? config.delay : '2000');
      const webhookSend = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
          content: result,
        }),
      });
      console.log(`[${getDate()}] Webhook Send for Channel ${webhook.split('/')[5]}: ${webhookSend.ok ? 'Succeed' : 'Failed'}`);
    }
  }
}, {
  // Enable scheduled option
  scheduled: true,
  // Define china timezone
  timezone: 'Asia/Shanghai',
});

function isValidCookie(cookies) {
  if (typeof cookies !== 'string') return undefined;
  const output = parseCookie(cookies);
  const requiredFields = ['account_id', 'cookie_token', 'ltoken'];
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
  return moment().format('YYYY-MM-DD HH:mm:ss')
}
