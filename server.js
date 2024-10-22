const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

let appointments = [];
let nextAppointmentId = 1;

function createAppointment(idBusiness, idService, phone, appointment_date_time, alias_campaign) {

    const appointment = {
        appointmentId: nextAppointmentId.toString(),
        id_business: idBusiness,
        id_service: idService,
        phone: phone,
        alias_campaign: alias_campaign,
        status: "AGENDADO",
        appointment_date_time: appointment_date_time,
        user_mail: "teste@teste.com"
    }

    nextAppointmentId++;
    return appointment;
}

server.post('/api/schedule/v1/appointment', (req, res) => {
    const { id_business, id_service, phone, appointment_date_time, alias_campaign} = req.body;

    if (!id_business || !id_service || !phone || !appointment_date_time || !alias_campaign) {
        return res.status(400).json({ error: 'Requisição inválida'});
    }

    try{

        const newAppointment = createAppointment(id_business, id_service, phone, appointment_date_time, alias_campaign);

        appointments.push(newAppointment);

        return res.status(201).json({
            appointmentId: newAppointment.appointmentId,
            user_mail: newAppointment.user_mail,
            status: newAppointment.status,
            appointment_date_time: newAppointment.appointment_date_time,
        });
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no servidor'});
    }
});

server.put('/api/schedule/v1/appointment/:appointmentId', (req, res) => {
    const {appointmentId} = req.params;
    const { appointment_date_time} = req.body;

    if (!appointment_date_time) {
        return res.status(400).json({ error: 'Requisição inválida'});
    }

    const appointment = appointments.find(app => app.appointmentId === appointmentId);

    if (!appointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado'});
    }

    try {
        appointment.appointment_date_time = appointment_date_time;

        return res.status(200).json({
            appointmentId: appointment.appointmentId,
            user_mail: appointment.user_mail,
            status: 'REAGENDADO',
            appointment_date_time: appointment.appointment_date_time,
        });
    } catch (error){
        return res.status(500).json({ error: 'Erro interno no servidor'});
    }
});

server.patch('/api/schedule/v1/appointment/cancel/:appointmentId', (req, res) => {
    const { appointmentId } = req.params;

    const appointment = appointments.find(app => app.appointmentId === appointmentId);

    if (!appointment){
        return res.status(404).json({ error: 'Agendamento não encontrado'});
    }

    try{
        appointment.status = 'CANCELADO';

        return res.status(204).end();
    } catch(error) {
        return res.status(500).json({ error: 'Erro interno no servidor'});
    }
});

server.get('/api/schedule/v1/appointment/me', (req, res) => {
    const {id_business, id_service} = req.query;

    if (!id_business || !id_service) {
        return res.status(400).json({ error: 'Requisição inválida'});
    }

    try{
        const user_mail = 'teste@teste.com';

        const user = appointments.find(u => u.user_mail === user_mail);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado'});
        }

        const appointment = appointments.find(app => app.id_business === id_business && app.id_service === id_service && app.user_mail === user_mail);

        if (appointment) {
            return res.status(200).json({
                appointmentId: appointment.appointmentId,
                has_appointment: true,
                user_mail: appointment.user_mail,
                appointment_date_time: appointment.appointment_date_time,
                status: appointment.status
            });
        } else {
            return res.status(400).json({
                message: 'Usuário não possui agendamentos',
                has_appointment: false
            });
        }
    } catch(error) {
        return res.status(500).json({ error: 'Erro interno no servidor'});
    }
});

const db = {
    "appointments": [
        {
            "appointmentId": "appointment1",
            "id_business": "3245",
            "id_service": "324",
            "start_date_time": "2024-10-18T09:00:00",
            "end_date_time": "2024-10-18T10:00:00"
        },
        {
            "appointmentId": "appointment2",
            "id_business": "3245",
            "id_service": "324",
            "start_date_time": "2024-10-18T12:00:00",
            "end_date_time": "2024-10-18T13:00:00"
        }
    ]
};

server.get('/api/schedule/v1/appointment/availability', (req,res) => {
    const { id_business, id_service } = req.query;
    const { start_date, end_date } = req.body;

    if (!id_business || !id_service || !start_date || !end_date) {
        return res.status(400).json({ error: 'Requisição inválida'});
    }

    try {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        function generateSlots (startDate, endDate) {
            let slots = [];
            let current = new Date(startDate);

            while (current < endDate) {
                let slotEnd = new Date(current.getTime() + 30*60000);
                slots.push({
                    start_date_time: current.toISOString(),
                    end_date_time: slotEnd.toISOString()
                });
                current = slotEnd;
            }
            return slots;
        }

        let allSlots = generateSlots(startDate, endDate);

        const busySlots = db.appointments.filter(app =>
            app.id_business === id_business &&
            app.id_service === id_service &&
            (
                (new Date(app.start_date_time) >= startDate && new Date(app.start_date_time) < endDate) ||
                (new Date(app.end_date_time) > startDate && new Date(app.end_date_time) <= endDate)
            )
        );

        const availableSlots = allSlots.filter(slot => {
            return !busySlots.some(busy => 
            (slot.start_date_time === busy.start_date_time && slot.end_date_time === busy.end_date_time)
            );
        });

        return res.status(200).json({
            'available_slots': availableSlots
        });

    } catch (error) {
        return res.status(500).json({ error: 'Erro interno no servidor'});
    }
});

server.use(router);

server.listen(3000, () => {
    console.log('JSON Server is running')
});

