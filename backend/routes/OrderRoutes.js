import express from 'express';
import { AuthenticateUser } from './UserRoutes.js';
import { Authenticate } from './ResRoutes.js'
import { AuthenticateDel } from './DelRoutes.js'
import OrderModel from '../models/OrderModel.js';

const router = express.Router();

//Route to create a new order
router.post('/newOrder', AuthenticateUser, async (req, res) => {

    try {
        const { restaurant, paymentId, deliveryAddress, orderItems, totalAmount } = req.body;
        console.log("data", req.body);
        const order = new OrderModel({
            user: req.UserId,
            restaurant,
            paymentId,
            deliveryAddress,
            orderItems,
            totalAmount
        });

        const newOrder = await order.save();
        console.log(newOrder);
        if (newOrder) {
            res.status(200).json(newOrder);
        }
        else {
            res.status(400).json({ error: "Invalid order data" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//Route to change order status
router.put('/updateOrder/:id', Authenticate, async (req, res) => {
    try {
        const order = await OrderModel.findById(req.params.id);
        const { orderStatus } = req.body;
        if (order) {
            order.orderStatus = orderStatus;
            const updatedOrder = await order.save();
            res.status(200).json(updatedOrder);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Route to change order status by delivery man
// router.put('/updateOrderStatus/:id', AuthenticateDel, async (req, res) => {
//     try {
//         const order = await OrderModel.findById(req.params.id);
//         const { orderStatus } = req.body;
//         if (order) {
//             order.orderStatus = orderStatus;
//             const updatedOrder = await order.save();
//             res.status(200).json(updatedOrder);
//         }
//         else {
//             res.status(404).json({ error: "Order not found" });
//         }
//     } catch (error) {
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

router.put('/updateOrderStatus/:id', AuthenticateDel, async (req, res) => {
    try {
        const order = await OrderModel.findById(req.params.id);
        const { orderStatus } = req.body;
        if (order) {
            order.orderStatus = orderStatus;
            const updatedOrder = await order.save();

            // If delivered, set drone status to AVAILABLE
            if (orderStatus === 'Delivered' && order.drone) {
                const DroneModel = (await import('../models/DroneModel.js')).default;
                const drone = await DroneModel.findById(order.drone);
                if (drone) {
                    drone.status = 'AVAILABLE';
                    await drone.save();
                }
            }

            res.status(200).json(updatedOrder);
        }
        else {
            res.status(404).json({ error: "Order not found" });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Route to assign delivery man to order

router.put('/assignDeliveryMan/:id', AuthenticateDel, async (req, res) => {
    try {
        const order = await OrderModel.findById(req.params.id);
        if (order) {
            order.deliveryman = req.DelId;
            const updatedOrder = await order.save();
            res.status(200).json(updatedOrder);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to assign drone to order
router.put('/assignDrone/:id', AuthenticateDel, async (req, res) => {
    try {
        const order = await OrderModel.findById(req.params.id);
        if (order) {
            const droneId = req.body.droneId;
            order.drone = droneId;
            await order.save();

            // Update drone status to IN_DELIVERY
            const DroneModel = (await import('../models/DroneModel.js')).default;
            const drone = await DroneModel.findById(droneId);
            if (drone) {
                drone.status = 'IN_DELIVERY';
                await drone.save();
            }

            res.status(200).json(order);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Route to get orders by restaurant Id

router.get('/getOrdersByResId/:id', Authenticate, async (req, res) => {
    try {
        const orders = await OrderModel.find({ restaurant: req.params.id })
            .select('-__v   -deliveryAddress')
            .populate('user', 'ownerName')
            .populate('paymentId', 'orderId')
            .populate('deliveryman', 'ownerName');

        if (orders) {
            res.status(200).json(orders);
        } else {
            console.log(error);
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {

        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/getAllDeliveredOrders', AuthenticateDel, async (req, res) => {
    try {
        const orders = await OrderModel.find({ orderStatus: 'Delivered' }) // changed from deliveryman
            .select('-__v -drone')
            .populate('user', 'ownerName phone')
            .populate('paymentId', 'orderId')
            .populate('restaurant', 'restaurantName phone city address countryName stateName')
            .populate('deliveryAddress', ' city state address country')

        if (orders) {
            res.status(200).json(orders);
        } else {
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// //Route to get all orders
// router.get('/getAllOrders', AuthenticateDel, async (req, res) => {
//     try {
//
//         const orders = await OrderModel.find({ deliveryman: null })
//             .select('-__v -deliveryman')
//             .populate('user', 'ownerName phone')
//             .populate('paymentId', 'orderId')
//             .populate('restaurant', 'restaurantName phone city address countryName stateName')
//             .populate('deliveryAddress', ' city state address country')
//
//
//         if (orders) {
//             res.status(200).json(orders);
//         } else {
//             res.status(404).json({ error: 'Orders not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

router.get('/getAllAcceptedOrders', AuthenticateDel, async (req, res) => {
    try {
        const orders = await OrderModel.find({drone : { $ne: null }}) // changed from deliveryman
            .select('-__v -drone')
            .populate('user', 'ownerName phone')
            .populate('paymentId', 'orderId')
            .populate('restaurant', 'restaurantName phone city address countryName stateName')
            .populate('deliveryAddress', ' city state address country')

        if (orders) {
            res.status(200).json(orders);
        } else {
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/getAllOrders', AuthenticateDel, async (req, res) => {
    try {
        const orders = await OrderModel.find({ drone: null }) // changed from deliveryman
            .select('-__v -drone')
            .populate('user', 'ownerName phone')
            .populate('paymentId', 'orderId')
            .populate('restaurant', 'restaurantName phone city address countryName stateName')
            .populate('deliveryAddress', ' city state address country')

        if (orders) {
            res.status(200).json(orders);
        } else {
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
//Route to get orders by deliveryman Id

router.get('/getOrdersByDelId/:id', AuthenticateDel, async (req, res) => {
    try {
        const orders = await OrderModel.find({ deliveryman: req.params.id })
            .select('-__v -deliveryman')
            .populate('user', 'ownerName phone')
            .populate('paymentId', 'orderId')
            .populate('restaurant', 'restaurantName phone city address countryName stateName')
            .populate('deliveryAddress');

        if (orders) {
            res.status(200).json(orders);
        } else {
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/getOrdersByDroneId/:id', AuthenticateDel, async (req, res) => {
    try {
        const orders = await OrderModel.find({ drone: req.params.id })
            .select('-__v -drone')
            .populate('user', 'ownerName phone')
            .populate('paymentId', 'orderId')
            .populate('restaurant', 'restaurantName phone city address countryName stateName')
            .populate('deliveryAddress');

        if (orders) {
            res.status(200).json(orders);
        } else {
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to get orders by user Id
router.get('/getOrdersByUserId', AuthenticateUser, async (req, res) => {
    try {
        const orders = await OrderModel.find({ user: req.UserId })
            .select('-__v -user -deliveryAddress')
            .populate('paymentId', 'orderId')
            .populate('restaurant', 'restaurantName')


        if (orders) {
            res.status(200).json(orders);
        } else {
            res.status(404).json({ error: 'Orders not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;