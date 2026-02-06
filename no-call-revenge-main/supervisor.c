#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <sys/user.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <program> [args...]\n", argv[0]);
        return 1;
    }

    pid_t child = fork();

    if (child == 0) {
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
        
        raise(SIGSTOP);
        
        execvp(argv[1], &argv[1]);
        
        perror("execvp");
        exit(1);
    }

    int status;
    int is_entry = 1;
    int exec_count = 0;
    struct user_regs_struct regs;

    waitpid(child, &status, 0);

    ptrace(PTRACE_SETOPTIONS, child, 0, PTRACE_O_EXITKILL | PTRACE_O_TRACESYSGOOD);

    while(1) {
        ptrace(PTRACE_SYSCALL, child, 0, 0);
        waitpid(child, &status, 0);

        if (WIFEXITED(status) || WIFSIGNALED(status)) break;

        if (WIFSTOPPED(status) && (WSTOPSIG(status) & 0x80)) {
            
            if(is_entry){
                ptrace(PTRACE_GETREGS, child, 0, &regs);

                if (regs.orig_rax == SYS_execve) {
                    
                    exec_count++;

                    
                    if (exec_count > 1) {
                        fprintf(stderr, "No hacking pls!!\n");
                        
                        kill(child, SIGKILL);
                        break;
                        
                    }
                }
            }
            is_entry = !is_entry;
        }
    }

    return 0;
}
