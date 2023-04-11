import Head from "next/head";
import Image from "next/image";
import styles from "@/styles/Home.module.css";
import dstyles from "@/styles/Denied.module.css"
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from "react";
import axios from "axios";
import { verifyMessage } from "ethers/lib/utils";
import { useAccount, useSignMessage } from "wagmi";
import Router from 'next/router'

export default function Denied() {
  const { address } = useAccount({
    onDisconnect() {
      Router.push("/")
    },
  });

  async function scorePassport() {
    //  Step #1 (Optional, only required if using the "signature" param when submitting a user's passport. See https://docs.passport.gitcoin.co/building-with-passport/scorer-api/endpoint-definition#submit-passport)
    //    We call our /api/scorer-message endpoint (/pages/api/scorer-message.js) which internally calls /registry/signing-message
    //    on the scorer API. Instead of calling /registry/signing-message directly, we call it via our api endpoint so we do not
    //    expose our scorer API key to the frontend.
    //    This will return a response like:
    //    {
    //      message: "I hereby agree to submit my address in order to score my associated Gitcoin Passport from Ceramic.",
    //      nonce: "b7e3b0f86820744b9242dd99ce91465f10c961d98aa9b3f417f966186551"
    //    }
    const scorerMessageResponse = await axios.get("/api/scorer-message");
    console.log("scorerMessageResponse: ", scorerMessageResponse);
    if (scorerMessageResponse.status !== 200) {
      console.error("failed to fetch scorer message");
      return;
    }
    setNonce(scorerMessageResponse.data.nonce);

    //  Step #2 (Optional, only required if using the "signature" param when submitting a user's passport.)
    //    Have the user sign the message that was returned from the scorer api in Step #1.
    signMessage({ message: scorerMessageResponse.data.message });
  }

  useEffect(() => {
    setNonce("");
  }, [address]);

  const { signMessage } = useSignMessage({
    async onSuccess(data, variables) {
      // Verify signature when sign message succeeds
      const address = verifyMessage(variables.message, data);

      //  Step #3
      //    Now that we have the signature from the user, we can submit their passport for scoring
      //    We call our /api/submit-passport endpoint (/pages/api/submit-passport.js) which
      //    internally calls /registry/submit-passport on the scorer API.
      //    This will return a response like:
      //    {
      //      address: "0xabc",
      //      error: null,
      //      evidence: null,
      //      last_score_timestamp: "2023-03-26T15:17:03.393567+00:00",
      //      score: null,
      //      status: "PROCESSING"
      //    }
      const submitResponse = await axios.post("/api/submit-passport", {
        address: address, // Required: The user's address you'd like to score.
        community: process.env.NEXT_PUBLIC_SCORER_ID, // Required: get this from one of your scorers in the Scorer API dashboard https://scorer.gitcoin.co/
        signature: data, // Optional: The signature of the message returned in Step #1
        nonce: nonce, // Optional: The nonce returned in Step #1
      });
      console.log("submitResponse: ", submitResponse);

      //  Step #4
      //    Finally, we can get the user's passport score.
      //    We call our /api/score/{scorer_id}/{address} endpoint (/pages/api/score/[scorer_id]/[address].js) which internally calls
      //    /registry/score/{scorer_id}/{address}
      //    This will return a response like:
      //    {
      //      address: "0xabc",
      //      error: null,
      //      evidence: null,
      //      last_score_timestamp: "2023-03-26T15:17:03.393567+00:00",
      //      score: "1.574606692",
      //      status: ""DONE""
      //    }
      const scoreResponse = await axios.get(
        `/api/score/${process.env.NEXT_PUBLIC_SCORER_ID}/${address}`
      );
      console.log("scoreResponse: ", scoreResponse.data);

      // Make sure to check the status
      if (scoreResponse.data.status === "ERROR") {
        alert(scoreResponse.data.error);
        return;
      }

      if (scoreResponse.data.score >= 1) {
        await Router.push("/dashboard")
      } else {
        alert(`You score is still too low. ${scoreResponse.data.score | 0}/1`)
      }
    },
  });

  const [nonce, setNonce] = useState("");

  return (
    <>
      <Head>
        <title>Score Gating</title>
        <meta
          name="description"
          content="A sample app to demonstrate using the Gitcoin Passport Scorer API"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.description}>
          <div>
            <a
              href="https://www.gitcoin.co/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/gitcoinWordLogo.svg"
                alt="Gitcoin Logo"
                className={styles.gitcoinLogo}
                width={150}
                height={34}
                priority
              />
            </a>
          </div>
          <ConnectButton />
        </div>

        <div className={dstyles.center}>
          <h1 className={dstyles.h1}>Improve Your Passport Score</h1>
          <p className={dstyles.p}>
            To protect our application from bots, we've implemented Gitcoin's Passport. Your Passport score is too low, meaning you either haven't created it yet or you're a bot. If you're not a robot, then head over to Passport and improve your score by adding more stamps. When you're finished, come back and re-score your Passport.
          </p>
          <a className={dstyles.link} target="_blank" href="https://passport.gitcoin.co">Click here to increase your score.</a>

          <button onClick={scorePassport} className={dstyles.btn}>Score Passport</button>
        </div>

        <div className={styles.grid}></div>
      </main>
    </>
  )
}