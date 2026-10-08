package com.substring.chat.controllers;

import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.playload.DeleteMessageResponse;
import com.substring.chat.repositories.RoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class RoomController {

    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomController(RoomRepository roomRepository, SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Create room
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody String roomId) {
        if (roomRepository.findByRoomId(roomId) != null) {
            return ResponseEntity.badRequest().body("Room already exists!");
        }
        Room room = new Room();
        room.setRoomId(roomId);
        Room savedRoom = roomRepository.save(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRoom);
    }

    // Join room
    @GetMapping("/{roomId}")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found !!");
        }
        return ResponseEntity.ok(room);
    }

    // Get messages of room
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<Message>> getMessages(
            @PathVariable String roomId,
            @RequestParam(value = "page", defaultValue = "0", required = false) int page,
            @RequestParam(value = "size", defaultValue = "50", required = false) int size
    ) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().build();
        }

        List<Message> messages = room.getMessages();
        if (messages == null) {
            messages = new ArrayList<>();
            room.setMessages(messages);
        }

        // Backfill IDs and timestamps for older messages if missing
        boolean updated = false;
        for (int i = 0; i < messages.size(); i++) {
            Message msg = messages.get(i);
            if (msg.getId() == null || msg.getId().trim().isEmpty()) {
                msg.setId("msg-" + i + "-" + UUID.randomUUID().toString().substring(0, 8));
                updated = true;
            }
            if (msg.getTimeStamp() == null) {
                msg.setTimeStamp(Instant.now());
                updated = true;
            }
        }
        if (updated) {
            roomRepository.save(room);
        }

        int start = Math.max(0, messages.size() - (page + 1) * size);
        int end = Math.min(messages.size(), start + size);

        List<Message> paginatedMessages = messages.subList(start, end);
        return ResponseEntity.ok(paginatedMessages);
    }

    // Delete a message by ID
    @DeleteMapping("/{roomId}/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable String roomId,
            @PathVariable String messageId
    ) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found !!");
        }

        if (room.getMessages() != null) {
            boolean removed = room.getMessages().removeIf(m -> m.getId() != null && m.getId().equals(messageId));
            if (removed) {
                roomRepository.save(room);
                // Broadcast delete event over STOMP to all subscribers
                DeleteMessageResponse deletePayload = new DeleteMessageResponse("DELETE", messageId, roomId);
                messagingTemplate.convertAndSend("/topic/room/" + roomId, deletePayload);
                return ResponseEntity.ok(deletePayload);
            }
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Message not found");
    }
}
