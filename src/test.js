const MAX_DELAY = 900; // 15 minutes (Amazon SQS Limit is 15 minutes)
const RETRY_BASE_INTERVAL = 30; //The earliest a retried message would become visible.

// let attempt = 1;
// function calculateExponentialDelayFor(attempt){
//   console.log( Math.pow(2, attempt - 1) );

//   let doubling_delay = RETRY_BASE_INTERVAL * Math.pow(2, attempt - 1); // 2nd retry doubled, 3rd retry quadrupled etc...
//   let randomized_delay_up_to_max = Math.random() * MAX_DELAY; // "jitter"
//   let actual_delay =  Math.floor( Math.min(randomized_delay_up_to_max, doubling_delay) ); // whichever is less.
//   console.log(`Calculated actual delay: ${actual_delay} s`);
//   return actual_delay;
// }

// console.log( calculateExponentialDelayFor(1) );

// console.log(true, `Message has already been retried ${attempt} times and won't be retried again.`, 'foo\nbar\nbaz');

let x = null;



x?.log("foo");