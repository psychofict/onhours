# Video script: OnHours demo, version 2

Length 2:38.8, 1920 by 1080, narrated by Murf (voice Natalie, style Narration), with burned-in captions and a separate caption file. No music. Every picture of the product is the real app, recorded by script; the group chat, the home screen, the quick-settings panel and the cards are drawn for the film and use made-up names.

The words below are what is spoken. The captions show the same words with the name written OnHours; the voice is given "On Hours" so it says the name as two words. Times are from the finished narration track. This file is written by `tools/video/make-script.py`; change `narration.json` and run it again instead of editing the times here.

## Scene 1: The problem (0:00 to 0:13)

On screen: A drawn group chat on a phone. A forwarded picture of a printed notice arrives, then three neighbours ask which group they are in. The view slowly closes in on the notice. Over the last line the real app opens on the phone.

| From | To | Spoken |
| --- | --- | --- |
| 0:01.5 | 0:04.7 | Every few days, a photo like this lands in the street group chat. |
| 0:05.1 | 0:09.5 | Tomorrow's power cuts. And everyone does the same sum in their head. |
| 0:09.9 | 0:13.4 | When is my area off? And what can I still get done? |

## Scene 2: The product, end to end (0:13 to 0:54)

On screen: The phone, filmed from the running app. A tap on Photograph the notice, then the sample photo: a reading state, then six areas. Riverside East is chosen, a job is typed in plain words (charge the radio 30 min), Plan my day is pressed, and the day chart draws in. Beside the phone, a panel says what the photo gives and shows the AI-reads, code-decides flow. Then a second, messier photo (tilted, a different layout, times in words, a cut past midnight) is read live: five areas, and Old Quarry's three cuts, with the overnight one split at midnight.

| From | To | Spoken |
| --- | --- | --- |
| 0:13.9 | 0:19.8 | This is OnHours. Take a photo of the notice, and it reads every area, with its power cuts. |
| 0:20.3 | 0:25.5 | Choose yours. Keep your jobs, or type new ones in plain words. Then plan the day. |
| 0:26.5 | 0:33.0 | Every job gets one unbroken stretch when the power is on. Nothing starts, and then loses power halfway through. |
| 0:33.5 | 0:41.5 | The AI only reads the notice. Plain, tested code places every job, so the same notice always gives the same plan. |
| 0:42.0 | 0:53.1 | It copes with a messy picture too. This one is tilted, laid out differently, and writes the times in words. It still reads five areas, and splits the overnight cut at midnight. |

## Scene 3: Why a job did not fit, the backup, and a revised notice (0:54 to 1:29)

On screen: The laptop view. The plan panel scrolls to Didn't fit: the beans, with the reason in one line. The Try 1 hour of backup button is pressed and the beans appear in the plan with On backup 20:00 to 20:45. The backup stepper goes up half an hour and back. Then a revised notice is filled in and read, and the card "The notice changed" lists the iron moving to 16:00 and the beans no longer fitting, each with its reason.

| From | To | Spoken |
| --- | --- | --- |
| 0:54.5 | 1:03.4 | When a job can't fit, OnHours says why. These beans need five hours in one go, and the longest stretch left is four hours fifteen. |
| 1:04.3 | 1:13.2 | If you have an inverter, say how long it runs. Now the beans fit, and the plan tells you when to switch: eight o'clock, for the last forty-five minutes. |
| 1:13.7 | 1:18.4 | Backup is just one number: the hours it runs. Nothing to calculate. |
| 1:19.1 | 1:28.7 | Then the chat sends a revised notice. Paste it, and OnHours shows what moved, and why. The iron shifts to four o'clock, and the beans no longer fit. |

## Scene 4: With no power and no network (1:29 to 1:54)

On screen: A drawn phone home screen: an Add to home screen prompt, the OnHours icon appearing, a tap, and the app opening onto its first screen. Then a quick-settings panel switches airplane mode on, the page is reloaded, the Offline note appears, and Right now still says the power is off until 09:00 and the sewing order is next (the demo clock is set to 08:00). Then the saved jobs and the Forget this device line.

| From | To | Spoken |
| --- | --- | --- |
| 1:30.5 | 1:33.0 | And here is the part that matters when the lights go out. |
| 1:33.5 | 1:38.9 | OnHours installs on the phone. Next time you open it, your jobs and your plan are already there. |
| 1:40.3 | 1:46.8 | Switch on airplane mode, and reload. It still tells you the power is off until nine, and what comes next. |
| 1:48.8 | 1:53.4 | Your jobs and your last notice stay on the phone. There is no account, and nothing is tracked. |

## Scene 5: Sharing (1:54 to 2:02)

On screen: The Plan picture dialog opens, still offline, then the calendar file is added.

| From | To | Spoken |
| --- | --- | --- |
| 1:55.0 | 2:01.5 | Send the plan to the family chat as a picture, or add it to your calendar, with a reminder ten minutes before every cut. |

## Scene 6: Who it is for, and how it was built (2:02 to 2:38)

On screen: Three drawn cards (the tailor, the baker, the pump family) with a sourced line about Ikeja Electric and a note that the households are illustrative, then the four planning documents ticking in beside the AI-reads, code-decides flow, then the first screen of the app with the repository name.

| From | To | Spoken |
| --- | --- | --- |
| 2:03.0 | 2:11.5 | It is for anyone who runs a home, or a small business, around scheduled power cuts. The tailor, the baker, the family with a water pump. |
| 2:12.0 | 2:17.4 | Wherever the schedule arrives as a message, OnHours turns it into a day someone can actually follow. |
| 2:18.1 | 2:30.3 | We built it plan first, with the Devpost skill pack: scope, requirements, spec, then code. It taught us to give the AI one small job, and to keep every decision in code you can test. |
| 2:31.3 | 2:34.3 | OnHours. Plan your day around the power cuts. |

## Checks on the narration

Each line was spoken by Murf as its own take and listened to by Whisper in two sizes (small and medium). The takes in the finished film have a word error of 0.12 or less in both against the script; the differences are the name (heard as "on hours", "on ours" or "an hour") and, in earlier lines, "plan first", sometimes heard as "planned first". The film's loudness is -16.1 LUFS with a true peak of -1.4 dBFS (ffmpeg ebur128). The commands are in BUILD-VIDEO.md.
