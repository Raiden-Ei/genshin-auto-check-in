const fetch = require('node-fetch');
const cron = require('node-cron');

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

  console.log(`[${getDate()}] Preparing auto check-in for ${config.signCookie.length} users..`);
  let succeedJobs = 0;
  let failedJobs = 0;
  for await (const jobCookie of config.signCookie) {
    const accountID = parseCookie(jobCookie).account_id;
    await waitFor(typeof config.delay === 'number' ? config.delay : 2000);
    console.log(`[${getDate()}] Starting check-in for userID ${accountID}`);
    if (!isValidCookie(jobCookie)) {
      console.log(`[${getDate()}] ERROR! Invalid cookie format detected for ${accountID}!`);
      failedJobs++;
    } else {
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
        console.log(`[${getDate()}] ERROR! Failed to check-in for userID ${accountID}: ${bodyResult?.message ?? 'Unknown'}`);
        failedJobs++;
      } else {
        succeedJobs++;
      }
    }
  }

  // Notify the count of succeed and failed jobs
  const result = `[${getDate()}] Result: [ Succeed ${succeedJobs} / Failed ${failedJobs} ]`;
  console.log(result);
  if (config.webhookURI) {
    const webhookSend = await fetch(config.webhookURI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: result,
      }),
    });
    console.log(`[${getDate()}] Webhook Send Status: ${webhookSend.ok ? 'Succeed' : 'Failed'}`);
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
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}
