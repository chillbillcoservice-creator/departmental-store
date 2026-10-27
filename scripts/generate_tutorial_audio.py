import os
import json
import base64
import urllib.request
import time

API_KEY = "AIzaSyAnYZHoD8EZ1TtKDIQDyaiSqEOlaWDJp8U"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_BASE = os.path.join(BASE_DIR, "public", "audio", "tutorial")

# Cleaned, polished scripts for all 16 features
FEATURES = [
    {
        "id": "billing",
        "title": "Fast Counter Billing & Barcode Scanning",
        "en": "Welcome to Fast Counter Billing. You can scan packaged goods with any barcode scanner, or type a numeric item code like hash 18 and press Enter to add Cadbury chocolate instantly. Press F11 to collect payment and complete the bill in under two seconds.",
        "hi": "काउंटर बिलिंग में आपका स्वागत है। आप बारकोड स्कैनर से सामान स्कैन कर सकते हैं, या बिना बारकोड वाले सामान का नंबर जैसे हैश 18 दबाकर एंटर करें। F11 दबाकर तुरंत पेमेंट लें और 2 सेकंड में बिल प्रिंट करें।",
        "hinglish": "Yeh hai aapka Fast Counter Billing. Packet wale saman ko barcode scanner se scan karein, ya bina barcode wale saman ka code jaise hash 18 type karke Enter dabayein. Payment lene ke liye F11 dabayein aur bill turant print ho jayega."
    },
    {
        "id": "scale",
        "title": "Weighing Scale & Decimal Produce",
        "en": "Weighed Produce Sales. For loose grocery items like Basmati Rice, sugar, or pulses, select the item and enter the exact weighing scale reading, such as 1.450 kilograms. The software calculates the exact price and deducts the precise weight from your inventory.",
        "hi": "वजन कांटा और खुले सामान की बिक्री। बासमती चावल, दाल या चीनी जैसे तौल कर बिकने वाले सामान के लिए, वजन कांटे का सटीक वजन जैसे 1.450 किलो टाइप करें। सॉफ्टवेयर सही कीमत निकालेगा और स्टॉक में से उतना ही वजन घटा देगा।",
        "hinglish": "Kante ka wazan aur khula saman. Loose chawal, daal ya cheeni ke liye, kante par jo wazan dikhe jaise 1.450 kilo type karein. Software exact rate calculate karega aur stock me se utna hi wazan minus kar dega."
    },
    {
        "id": "void_cart",
        "title": "1-Click Void Cart (F7 Hotkey)",
        "en": "One-Click Void Cart. If a walk-in customer leaves the queue or changes their mind, press the red Void button or hit F7. All cart items are immediately returned to available store stock and the counter is ready for the next customer in half a second.",
        "hi": "1-क्लिक वॉइड कार्ट। यदि कोई ग्राहक बिलिंग के बीच सामान छोड़कर चला जाए, तो F7 दबाएं। कार्ट का सारा सामान तुरंत दुकान के स्टॉक में वापस जुड़ जाता है और काउंटर तुरंत नए ग्राहक के लिए खाली हो जाता है।",
        "hinglish": "1-Click Void Cart. Agar koi customer line chhod kar chala jaye ya samaan lene se mana kare, toh F7 dabayein. Saara samaan wapas store inventory me add ho jayega aur counter turant naye customer ke liye ready ho jayega."
    },
    {
        "id": "upi_standee",
        "title": "Counter Standee UPI QR & Instant Verification",
        "en": "Counter Standee UPI Mode. Customers scan your existing counter paper QR using Google Pay, PhonePe, or Paytm. The live listener detects the bank payment, displays the verified UTR number in green, and automatically prints the receipt without touching the screen.",
        "hi": "काउंटर स्टैंडी यूपीआई मोड। ग्राहक आपके काउंटर पर रखे मौजूदा पेपर स्टैंडी को गूगल पे, फोनपे या पेटीएम से स्कैन करता है। सिस्टम बैंक पेमेंट को तुरंत पकड़कर यूटीआर नंबर के साथ स्क्रीन हरी कर देता है और रसीद अपने आप निकल आती है।",
        "hinglish": "Counter Standee UPI Mode. Customer aapke counter par lage paper standee ko Google Pay ya PhonePe se scan karega. Software bank se payment confirm karke green tick aur UTR number dikhayega aur bill auto print ho jayega."
    },
    {
        "id": "soundbox",
        "title": "In-Software Voice Soundbox (Zero Rental)",
        "en": "In-Software Soundbox. Your billing computer plays a loud cash register chime followed by clear voice confirmation in English or Hindi, such as: Payment of Rupees 850 received successfully. This completely eliminates monthly soundbox rental fees.",
        "hi": "इन-सॉफ्टवेयर साउंडबॉक्स। आपका कंप्यूटर तेज घंटी बजाकर साफ हिंदी में बोलता है: यूपीआई पर 850 रुपये प्राप्त हुए। इससे आपको किसी बाहरी साउंडबॉक्स मशीन का हर महीने 150 से 250 रुपये किराया देने की जरूरत नहीं पड़ती।",
        "hinglish": "In-Software Soundbox. Aapka billing computer ek loud cash chime bajata hai aur clear awaz me bolta hai: UPI par 850 rupaye prapt hue. Isse har mahine soundbox ka dedh sau se do sau rupaye kiraya bach jata hai."
    },
    {
        "id": "cash_drawer",
        "title": "Cash Drawer Shifts & Evening Galla Tally",
        "en": "Cash Drawer Shifts and Tally. Enter your morning opening cash float for loose change. Throughout the day, the system tracks cash sales, Khata collections, and cash expenses. At evening day close, enter your counted notes to verify zero cash discrepancy.",
        "hi": "गल्ला मिलान और कैश ड्रावर। सुबह दुकान खोलते समय छुट्टे पैसों के लिए ओपनिंग फ्लोट दर्ज करें। दिन भर की नकद बिक्री, उधारी वसूली और नकद खर्चों को जोड़कर शाम को नोटों की गिनती का सटीक मिलान करें।",
        "hinglish": "Cash Drawer aur Sham Ka Galla Tally. Subah counter kholte hi chutey paison ka morning float dalein. Din bhar cash sale, khata collection aur kharche track hote hain. Sham ko note gin kar dalein aur exact hisab match karein."
    },
    {
        "id": "staff_mgmt",
        "title": "Staff Management, Usernames & PINs",
        "en": "Staff Management. Add your store employees, assign roles like Cashier, Inventory Clerk, or Floor Helper, and set their monthly salary. Each employee receives a simple username like at rahul and a 4-digit numeric PIN for lightning-fast counter login.",
        "hi": "स्टाफ प्रबंधन। अपने कर्मचारियों को जोड़ें, पद जैसे कैशियर या हेल्पर चुनें, और मासिक वेतन तय करें। हर कर्मचारी को एक सरल यूज़रनेम और 4-अंकों का पिन मिलता है जिससे वे काउंटर पर 2 सेकंड में लॉगिन कर सकें।",
        "hinglish": "Staff Management. Apne dukan ke employees add karein, role jaise Cashier ya Helper select karein, aur monthly salary dalein. Har staff ko ek simple username jaise at rahul aur 4-digit PIN milta hai taaki counter par fast login kar sakein."
    },
    {
        "id": "attendance",
        "title": "Staff Daily Attendance & Lock Protection",
        "en": "Staff Daily Attendance. Open the interactive calendar and click today. Mark Present, Absent, or Half-Day in a single click, and attach shift notes. Past dates are locked to prevent tampering, ensuring transparent payroll.",
        "hi": "कर्मचारियों की दैनिक हाजिरी। कैलेंडर पर आज की तारीख चुनें। सिर्फ 1 क्लिक में उपस्थित, अनुपस्थित, या आधा दिन मार्क करें। पुरानी तारीखें अपने आप लॉक रहती हैं ताकि कोई गलत हाजिरी न लगा सके।",
        "hinglish": "Staff Ki Rozana Haziri. Calendar par aaj ki date par click karein. Ek click me Present, Absent ya Half-day mark karein. Purani dates lock rehti hain taaki koi chhedchhad na ho sake."
    },
    {
        "id": "advance",
        "title": "Salary Advances & Auto Payroll Deductions",
        "en": "Salary Advances. Record emergency cash or UPI advances given to staff during the month. At month end, the system automatically deducts all active advances from their attended working days, displaying the exact net payable salary with zero disputes.",
        "hi": "सैलरी एडवांस। महीने के बीच में कर्मचारी को दिए गए कैश या यूपीआई एडवांस को दर्ज करें। महीने के अंत में सॉफ्टवेयर कुल हाजिरी के आधार पर एडवांस काटकर सटीक शुद्ध देय वेतन दिखाता है।",
        "hinglish": "Salary Advance. Mahine ke beech me staff ko diya gaya cash ya online advance record karein. Mahine ke aakhir me software attendance ke hisab se advance kaat kar exact bacha hua salary dikhayega."
    },
    {
        "id": "customer_khata",
        "title": "Customer Khata (Udhaar) & Credit Limits",
        "en": "Customer Khata and Udhaar Ledger. Build neighborhood loyalty by supporting partial payments. If a bill is 1,200 and the customer pays 500, the remaining 700 is booked to their digital Khata. When they return next time, a red alert reminds the cashier to collect pending dues.",
        "hi": "ग्राहक खाता और उधारी बहीखाता। ग्राहकों को आंशिक भुगतान की सुविधा दें। 1,200 के बिल में यदि ग्राहक 500 देता है तो बाकी 700 स्वतः उसके खाते में जुड़ जाता है। अगली बार आते ही स्क्रीन पर लाल अलर्ट दिखता है।",
        "hinglish": "Customer Khata aur Udhaar Bahi-Khata. Grahak ko partial payment ki suvidha dein. Barah sau ke bill me agar grahak 500 cash de, toh bache 700 khate me auto add honge. Agli baar bill banate hi pending alert dikhega."
    },
    {
        "id": "expenses",
        "title": "Daily Store Expenses & Petty Cash",
        "en": "Daily Store Expense Tracker. Log out-of-pocket overheads like staff tea and snacks, electricity bills, shop maintenance, carry bags, or wholesale mandi delivery tempo fare. Real-time KPI cards show today and this month expenses cleanly.",
        "hi": "दुकान के दैनिक खर्च। स्टाफ की चाय-नाश्ता, बिजली का बिल, दुकान की मरम्मत, और अनाज मंडी का टेंपो भाड़ा आसानी से दर्ज करें। कार्ड्स पर आज का और महीने का कुल खर्च साफ-साफ दिखता है।",
        "hinglish": "Dukan Ke Rozana Kharche. Staff ki chai-nashta, bijli bill, dukan repairing, aur mandi ka tempo bhada asani se note karein. Screen par aaj ka aur mahine ka total kharcha clear dikhta hai."
    },
    {
        "id": "vendor_po",
        "title": "Vendor Purchase Orders (PO)",
        "en": "Vendor Purchase Orders. When store stock runs low, select your distributor, pick products like Aashirvaad Atta or Sunfeast biscuits, specify quantities and negotiated wholesale rates, and export a ready-to-send WhatsApp order in thirty seconds.",
        "hi": "सप्लायर खरीद ऑर्डर। दुकान में सामान कम होते ही डिस्ट्रीब्यूटर चुनें, आशीर्वाद आटा या बिस्कुट जैसे सामान की मात्रा और थोक रेट डालें, और 30 सेकंड में व्हाट्सएप पीडीएफ पर्चा तैयार करें।",
        "hinglish": "Distributor Purchase Order. Maal kam hote hi supplier select karein, Aashirvaad Atta ya biscuits ki quantity dalein, aur direct WhatsApp PDF bana kar distributor ke salesman ko bhej dein."
    },
    {
        "id": "delivery_grn",
        "title": "Delivery Intake & Auto Stock-In (GRN)",
        "en": "Delivery Intake and GRN. When the distributor delivery truck arrives, open the pending purchase order, verify the physical cartons delivered, and click Confirm Delivery. Your store stock is automatically incremented with zero manual entry errors.",
        "hi": "माल की डिलीवरी और ऑटो-स्टॉक। डिस्ट्रीब्यूटर की गाड़ी माल लेकर आते ही पेंडिंग ऑर्डर खोलें, दुकान में उतरे सामान की गिनती मिलाएं, और कन्फर्म डिलीवरी दबाएं। स्टोर का स्टॉक तुरंत अपने आप बढ़ जाएगा।",
        "hinglish": "Delivery Inward Intake. Distributor ki delivery gadi aane par pending order kholein, cartons ki ginti match karein, aur Confirm Delivery dabayein. Dukan ka stock turant 1 click me update ho jayega."
    },
    {
        "id": "gstr1_tax",
        "title": "1-Click GSTR-1 Tax Export & Profit Analytics",
        "en": "GSTR-1 Tax Return and Profit Analytics. At month end, download government-format GST sales returns with B2B buyer GSTIN details and HSN summaries in one click. Send it straight to your accountant and view true net store profits.",
        "hi": "जीएसटीआर-1 टैक्स रिपोर्ट और मुनाफा विश्लेषण। महीने के अंत में 1 क्लिक में सरकारी प्रारूप की एक्सेल फाइल डाउनलोड करें, जिसमें बी2बी और बी2सी का अलग हिसाब होता है। इसे सीए को भेजें और दुकान का वास्तविक शुद्ध लाभ देखें।",
        "hinglish": "GSTR-1 Tax Return aur Munafa Report. Mahine ke end me 1 click me govt format GST Excel sheet download karein jisme B2B bills aur HSN summary ready rehti hai. CA ko direct bhein aur dukan ka net munafa dekhein."
    },
    {
        "id": "setup",
        "title": "Business Setup Wizard & Store Profile",
        "en": "Business Setup Wizard. Get started in four simple steps. Set your store legal details and GSTIN, configure the owner profile with a 4-digit master PIN, add initial staff permissions, and load distributor contacts.",
        "hi": "दुकान सेटअप विज़ार्ड। 4 आसान चरणों में शुरुआत करें। दुकान का नाम, पता और जीएसटी नंबर दर्ज करें, मालिक का 4-अंकों का मास्टर पिन सेट करें, और कर्मचारियों के अधिकार तय करें।",
        "hinglish": "Dukan Setup Wizard. 4 aasan steps me dukan start karein. Store ka legal naam aur GSTIN dalein, malik ka master PIN set karein, staff permissions lagayein, aur store launch karein."
    },
    {
        "id": "shift_handover",
        "title": "360° Shift Handover & Staff Logout Audit (X-Report)",
        "en": "Shift Handover and Manager Logout Report. When closing your counter shift, click End Shift. The software calculates your exact working hours, sales generated, payment breakdown, vendor purchase orders created, and vendor deliveries received. Enter your counted till cash to verify physical drawer accuracy, print a thermal handover slip, and send a summary straight to the store owner on WhatsApp before logging out.",
        "hi": "शिफ्ट हैंडओवर और मैनेजर रिपोर्ट। काउंटर छोड़ने से पहले एंड शिफ्ट पर क्लिक करें। सॉफ्टवेयर आपके काम के घंटे, कुल बिक्री, सप्लायर खरीद ऑर्डर, और माल की डिलीवरी का पूरा हिसाब निकालता है। गल्ले के नोट गिनकर डालें, रसीद प्रिंट करें और 1 क्लिक में मालिक को व्हाट्सएप रिपोर्ट भेजें।",
        "hinglish": "Shift Handover aur Manager Logout Report. Counter chhodne se pehle End Shift par click karein. Software aapke kaam ka time, total sales, distributor purchase orders, aur delivery intake ka 360 degree hisab banata hai. Galla gin kar match karein, receipt print karein aur direct malik ko WhatsApp report bhej kar logout karein."
    }
]

# Universal 3 x 3 Voice Model Configuration
VOICE_SPECS = {
    "puck": {
        "hi": ("hi-IN-Chirp3-HD-Puck", "hi-IN", 0.72),
        "hinglish": ("hi-IN-Chirp3-HD-Puck", "hi-IN", 0.74),
        "en": ("en-IN-Chirp3-HD-Puck", "en-IN", 0.85),
    },
    "algieba": {
        "hi": ("hi-IN-Chirp3-HD-Algieba", "hi-IN", 0.74),
        "hinglish": ("hi-IN-Chirp3-HD-Algieba", "hi-IN", 0.74),
        "en": ("en-IN-Chirp3-HD-Algieba", "en-IN", 0.85),
    },
    "studio_o": {
        "hi": ("hi-IN-Chirp3-HD-Aoede", "hi-IN", 0.74),
        "hinglish": ("hi-IN-Chirp3-HD-Aoede", "hi-IN", 0.74),
        "en": ("en-US-Studio-O", "en-US", 0.88),
    }
}

GREETING_SCRIPTS = {
    "puck": {
        "hi": "नमस्ते! मैं पक हूँ, आपका चिलबिल ऑडियो गाइड। मैं आपको काउंटर बिलिंग और दुकान की हर नई सुविधा आसानी से सिखाऊंगा।",
        "hinglish": "Hello! Main Puck hoon, aapka ChillBill audio guide. Billing aur store operations ko smooth banana seekhenge.",
        "en": "Hello! I am Puck, your ChillBill audio guide. Let's master fast counter billing and store operations together."
    },
    "algieba": {
        "hi": "नमस्ते! मैं अल्जीबा हूँ। चिलबिल में आपका स्वागत है। चलिए सीखते हैं सुपरफास्ट काउंटर बिलिंग कैसे करें।",
        "hinglish": "Namaste! Main Algieba hoon. ChillBill me aapka swagat hai. Fast billing aur store operations seekhte hain.",
        "en": "Hello! I am Algieba, your ChillBill audio guide. I will help you master lightning fast billing and store operations."
    },
    "studio_o": {
        "hi": "नमस्ते! मैं आपकी स्टूडियो ऑडियो गाइड हूँ। चिलबिल की हर स्क्रीन और सुविधा को समझने में मैं आपकी मदद करूंगी।",
        "hinglish": "Welcome! Main aapki studio audio guide hoon. Store ki har screen aur feature me aapki help karungi.",
        "en": "Welcome to ChillBill! I am your studio voice assistant, here to guide you through every screen and retail workflow."
    }
}

def synthesize(text, voice_name, lang_code, speaking_rate, out_path):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return True # already exists
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}"
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": lang_code, "name": voice_name},
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": speaking_rate,
            "sampleRateHertz": 44100
        }
    }
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read().decode("utf-8"))
            audio_bytes = base64.b64decode(data["audioContent"])
            with open(out_path, "wb") as f:
                f.write(audio_bytes)
            print(f"  [OK] Saved {os.path.basename(out_path)} ({len(audio_bytes)} bytes)")
            time.sleep(0.15)
            return True
        except Exception as e:
            print(f"  [Attempt {attempt+1} Fail] {out_path}: {e}")
            time.sleep(1.0)
    return False

def main():
    print(f"Starting Universal 3x3 Audio Matrix Pre-rendering into {OUTPUT_BASE}...")
    
    # 1. Greetings (3 personas x 3 languages = 9 greeting tracks)
    print("\n--- Generating Greetings (3x3 Matrix) ---")
    for persona, lang_dict in GREETING_SCRIPTS.items():
        for lang, text in lang_dict.items():
            vname, lcode, rate = VOICE_SPECS[persona][lang]
            out_p = os.path.join(OUTPUT_BASE, persona, f"greeting_{lang}.mp3")
            synthesize(text, vname, lcode, rate, out_p)
            # Legacy alias greeting.mp3
            if lang == "hi" or (persona != "puck" and lang == "en"):
                legacy_p = os.path.join(OUTPUT_BASE, persona, "greeting.mp3")
                if not os.path.exists(legacy_p) and os.path.exists(out_p):
                    import shutil
                    shutil.copyfile(out_p, legacy_p)
    
    # 2. Features (16 features x 3 personas x 3 languages = 144 tracks)
    print("\n--- Generating Feature Audio Tracks (3x3 Matrix) ---")
    for persona, specs in VOICE_SPECS.items():
        print(f"\n>> Processing Persona: {persona.upper()} <<")
        for feat in FEATURES:
            fid = feat["id"]
            for lang in ["hi", "hinglish", "en"]:
                vname, lcode, rate = specs[lang]
                text = feat[lang]
                out_p = os.path.join(OUTPUT_BASE, persona, f"{fid}_{lang}.mp3")
                synthesize(text, vname, lcode, rate, out_p)

    print("\nUniversal 3x3 Audio Matrix pre-rendering completed successfully!")

if __name__ == "__main__":
    main()
