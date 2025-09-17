import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
// S3 Packages
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
// Models
import Subscription from '../../models/subscription.js';


// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// S3 Bucket constants
const bucketName = process.env.BUCKET_NAME;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;
const bucketRegion = process.env.BUCKET_REGION;

const s3 = new S3Client({
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey,
    },
    region: bucketRegion
});




// -------------- Common --------------
export const generateOTP = (length) => {
    let otp = "";
    const charset = "0123456789";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        otp += charset[randomIndex];
    }

    return otp;
};

export const toTitleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);
export const removeExtraSpaces = (str) => str.trim().replace(/\s+/g, ' ');

export const shuffleArray = (arr) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};




// -------------- Handling Media files --------------
export const saveFile = (file, destination) => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(__dirname, `../../${destination}/${fileName}`);

    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

    file.mv(filePath, (err) => {
        if (err) {
            console.log('Error while uploading file --> ', err);
            return false;
        }
    });

    return fileName;
}

export const deleteFile = (fileName, destination) => {

    const filePath = path.join(__dirname, `../../${destination}`, fileName);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('File deleted successfully.');
            return true;
        } else {
            console.log('File not found.');
            return false;
        }
    } catch (err) {
        console.error('Error while deleting file --> ', err);
        return false;
    }
};

// S3

export const saveFileToS3 = async (file) => {

    const fileName = `${Date.now()}-${file.name}`;

    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: req.file.mimetype
    }

    const command = new PutObjectCommand(params);
    await s3.send(command);
    return fileName;
}



// -------------- Student Module --------------
export const planDetails = (priceId) => {
    if (priceId === process.env.BRONZE_PRICE_ID) {
        return { name: 'Bronze', price: '$170', courseLimit: 4, color: '#391802' }
    }

    if (priceId === process.env.SILVER_PRICE_ID) {
        return { name: 'Silver', price: '$200', courseLimit: 8, color: '#A8A9AD' }
    }

    if (priceId === process.env.GOLD_PRICE_ID) {
        return { name: 'Gold', price: '$250', courseLimit: 12, color: '#FFBF00' }
    }

    // For Testing purpose
    if (priceId === process.env.DAILY_PRICE_ID) {
        return { name: 'Daily', price: '$10', courseLimit: 2, color: '#F0BF00' }
    }
}

export const calcNumberOfCycles = (subscription) => {
    const currentPeriodStart = subscription.current_period_start;
    const startDate = new Date(subscription.start_date);
    const currentDate = new Date();

    // Calculate the number of cycles
    const numberOfCycles = Math.floor((currentDate - startDate) / (subscription.plan.interval_count * 30 * 24 * 60 * 60 * 1000));

    return numberOfCycles
}

export const getStudentActivePlan = async (subscription) => {

    let activedPlan = null;

    if (subscription) {
        let dbReceipt = null;

        // If mongoose object provided
        if (subscription instanceof mongoose.Document) {
            dbReceipt = subscription;
        }

        // If id provided (string or mongoose id obj)
        if (typeof subscription === 'string' || mongoose.Types.ObjectId.isValid(subscription)) {
            dbReceipt = await Subscription.findById(subscription);
        }



        activedPlan = {
            _id: dbReceipt._id,
            ...planDetails(dbReceipt.priceId),
            user: dbReceipt._id,
            status: dbReceipt.status,
            subscriptionId: dbReceipt.subscriptionId,
            customerId: dbReceipt.customerId,
            priceId: dbReceipt.priceId,
            trailsEndAt: dbReceipt.trailsEndAt,
            endsAt: dbReceipt.endsAt,
            billingCycleAnchor: dbReceipt.billingCycleAnchor,
            currentPeriodStart: dbReceipt.currentPeriodStart,
            currentPeriodEnd: dbReceipt.currentPeriodEnd,
            createdAt: dbReceipt.createdAt,
            updatedAt: dbReceipt.updatedAt,
        }
    }

    return activedPlan;

}

