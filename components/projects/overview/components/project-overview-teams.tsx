import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { ProjectMember, ProjectTeamSummary } from "../types";

type ProjectOverviewTeamsProps = {
  teams: ProjectTeamSummary[];
  members: ProjectMember[];
};

export function ProjectOverviewTeams({
  teams,
  members,
}: ProjectOverviewTeamsProps) {
  const memberLookup = new Map(members.map((member) => [member.id, member]));

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight md:text-[1.1rem]">
          Teams on Project
        </h2>
        <p className="text-muted-foreground text-[13px] leading-6 md:text-sm">
          The groups currently assigned to this work, what they own, and how they are tracking.
        </p>
      </div>

      {teams.length ? (
        <div className="divide-y border-y">
          {teams.map((team) => {
            const teamMembers = team.memberIds
              .map((memberId) => memberLookup.get(memberId))
              .filter((member): member is ProjectMember => Boolean(member));
            const visibleMembers = teamMembers.slice(0, 4);
            const extraMembers = Math.max(teamMembers.length - visibleMembers.length, 0);

            return (
              <div
                key={team.id}
                className="grid gap-4 py-4 md:grid-cols-[minmax(0,1.4fr)_auto_auto] md:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="text-sm font-medium leading-6">{team.name}</div>
                  <p className="text-muted-foreground text-[12px] leading-6 md:text-[13px]">
                    {team.focus}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-[12px]">
                    <Badge variant="outline" className="font-medium">
                      {team.pipelineIds.length} pipeline
                      {team.pipelineIds.length === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline" className="font-medium">
                      {team.progress}% complete
                    </Badge>
                  </div>
                </div>

                <div className="md:justify-self-center">
                  <AvatarGroup>
                    {visibleMembers.map((member) => (
                      <Avatar
                        key={member.id}
                        size="default"
                        userCard={{
                          name: member.name,
                          role: member.role,
                          team: team.name,
                          status: member.active ? "Active" : "Offline",
                        }}
                      >
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                    {extraMembers ? (
                      <AvatarGroupCount className="text-[11px]">+{extraMembers}</AvatarGroupCount>
                    ) : null}
                  </AvatarGroup>
                </div>

                <div className="text-muted-foreground text-[12px] md:justify-self-end md:text-right md:text-[13px]">
                  {team.dueWindow}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground border-y py-4 text-[13px] md:text-sm">
          No teams match the current filters.
        </div>
      )}
    </section>
  );
}
