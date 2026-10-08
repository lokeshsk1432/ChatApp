package com.substring.chat.controllers;

import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.playload.DeleteMessageRequest;
import com.substring.chat.playload.DeleteMessageResponse;
import com.substring.chat.playload.MessageRequest;
import com.substring.chat.repositories.RoomRepository;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestBody;

import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;

@Controller
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class ChatController {

    private final RoomRepository roomRepository;

    public ChatController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // For sending and receiving messages
    @MessageMapping("/sendMessage/{roomId}") // /app/sendMessage/{roomId}
    @SendTo("/topic/room/{roomId}") // subscribe
    public Message sendMessage(
            @DestinationVariable String roomId,
            @RequestBody MessageRequest request
    ) {
        String targetRoomId = (request.getRoomId() != null && !request.getRoomId().trim().isEmpty())
                ? request.getRoomId()
                : roomId;
        Room room = roomRepository.findByRoomId(targetRoomId);

        Message message = new Message();
        message.setId(UUID.randomUUID().toString());
        message.setContent(request.getContent());
        message.setSender(request.getSender());
        message.setTimeStamp(Instant.now());
        message.setReplyTo(request.getReplyTo());

        if (room != null) {
            if (room.getMessages() == null) {
                room.setMessages(new ArrayList<>());
            }
            room.getMessages().add(message);
            roomRepository.save(room);
        } else {
            throw new RuntimeException("Room not found !!");
        }

        return message;
    }

    // For deleting messages in real-time
    @MessageMapping("/deleteMessage/{roomId}") // /app/deleteMessage/{roomId}
    @SendTo("/topic/room/{roomId}") // broadcast deletion to room subscribers
    public DeleteMessageResponse deleteMessage(
            @DestinationVariable String roomId,
            @RequestBody DeleteMessageRequest request
    ) {
        String targetRoomId = (request.getRoomId() != null && !request.getRoomId().trim().isEmpty())
                ? request.getRoomId()
                : roomId;
        Room room = roomRepository.findByRoomId(targetRoomId);

        if (room != null && room.getMessages() != null) {
            room.getMessages().removeIf(m -> m.getId() != null && m.getId().equals(request.getMessageId()));
            roomRepository.save(room);
        }

        return new DeleteMessageResponse("DELETE", request.getMessageId(), targetRoomId);
    }
}
